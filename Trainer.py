from datetime import datetime
import tensorflow as tf
from tensorflow.python.client import timeline
from util import mkdir_tfboard_run_dir,mkdir,shell_command, delete_old_model_backups
from data_augmentation import process_data, process_data_continuous
import os
from Dataset import Dataset
from ai.record_reader import RecordReader
import argparse
from util import mkdir, sync_from_aws, sync_to_aws
from threading import Thread
import queue
from functools import partial


class Trainer:

    def __init__(self,
                 data_path,
                 model_file,
                 s3_bucket,
                 epochs=50,
                 max_sample_records=500,
                 start_epoch=0,
                 batch_size=50,
                 is_restored_model=False,
                 restored_model_dir=None,
                 tf_timeline=False,
                 show_speed=False,
                 s3_sync=True,
                 save_to_disk=False,
                 image_scale=1.0):

        self.data_path = data_path
        self.save_to_disk = save_to_disk
        self.is_restored_model = is_restored_model
        self.batch_size = batch_size
        self.record_reader = RecordReader(base_directory=self.data_path,batch_size=self.batch_size)
        self.s3_bucket = format_s3_bucket(s3_bucket)
        self.model_file = model_file
        self.n_epochs = int(epochs)
        self.max_sample_records = max_sample_records
        self.tf_timeline = tf_timeline
        self.s3_sync = s3_sync
        self.image_scale = image_scale

        # Always sync before training in case I ever train multiple models in parallel
        if self.s3_sync is True:  # You have the option to turn off the sync during development to save disk space
            sync_from_aws(s3_path=self.s3_bucket, local_path=self.data_path)

        if is_restored_model:
            self.model_dir = restored_model_dir
        elif self.save_to_disk is True:
            self.tfboard_basedir = os.path.join(self.data_path, 'tf_visual_data', 'runs')
            self.model_dir = mkdir_tfboard_run_dir(self.tfboard_basedir)

        if self.save_to_disk is True:
            self.results_file = os.path.join(self.model_dir, 'results.txt')
            self.speed_file = os.path.join(self.model_dir, 'speed.txt')
            self.model_checkpoint_dir = os.path.join(self.model_dir,'checkpoints')
            self.saver = tf.train.Saver()
            mkdir(self.model_checkpoint_dir)

        self.start_epoch = start_epoch

        # Prints batch processing speed, among other things
        self.show_speed = show_speed

    # Create this function to make it threadable / parallelizable
    def get_batch(self,is_train):
        if is_train == True:
            while True:
                batch = self.record_reader.get_train_batch()
                images, labels = process_data_continuous(
                    data=batch,
                    image_scale=self.image_scale)
                self.train_batches.put((images, labels))
        else:
            while True:
                batch = self.record_reader.get_test_batch()
                images, labels = process_data_continuous(
                    data=batch,
                    image_scale=self.image_scale)
                self.test_batches.put((images, labels))

    # This function is agnostic to the model
    def train(self, sess, x, y_, optimization, train_step, train_feed_dict, test_feed_dict):

        # To view graph: tensorboard --logdir=/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs
        tf.summary.scalar('optimization', optimization)
        merged = tf.summary.merge_all()

        # Archive the model script in case of good results that need to be replicated
        # If model is being restored, then assume model file has already been saved somewhere
        # and that self.model_file is None
        if self.model_file is not None and self.save_to_disk is True:
            cmd = 'cp {model_file} {archive_path}'
            shell_command(cmd.format(model_file=self.model_file, archive_path=self.model_dir + '/'))

        if not self.is_restored_model:  # Don't want to erase restored model weights
            sess.run(tf.global_variables_initializer())

        # TODO: Document and understand what RunOptions does
        run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
        run_opts_metadata = tf.RunMetadata()

        train_batch = self.record_reader.get_train_batch()
        train_images, train_labels = process_data_continuous(
            data=train_batch,
            image_scale=self.image_scale)
        train_feed_dict[x] = train_images
        train_feed_dict[y_] = train_labels

        train_summary, train_accuracy = sess.run([merged, optimization], feed_dict=train_feed_dict,
                                                 options=run_opts, run_metadata=run_opts_metadata)
        test_batch = self.record_reader.get_test_batch()
        test_images, test_labels = process_data_continuous(
            data=test_batch,
            image_scale=self.image_scale)
        test_feed_dict[x] = test_images
        test_feed_dict[y_] = test_labels
        test_summary, test_accuracy = sess.run([merged, optimization], feed_dict=test_feed_dict,
                                               options=run_opts, run_metadata=run_opts_metadata)

        # Always worth printing accuracy, even for a restored model, since it provides an early sanity check
        message = "epoch: {0}, training accuracy: {1}, validation accuracy: {2}"
        print(message.format(self.start_epoch, train_accuracy, test_accuracy))

        if self.tf_timeline:  # Used for debugging slow Tensorflow code
            create_tf_timeline(self.model_dir, run_opts_metadata)

        # Don't double-count. A restored model already has its last checkpoint and results.txt entry available
        if not self.is_restored_model and self.save_to_disk is True:
            with open(self.results_file,'a') as f:
                f.write(message.format(self.start_epoch, train_accuracy, test_accuracy)+'\n')
            self.save_model(sess, epoch=self.start_epoch)
            if self.s3_sync is True:  # You have the option to turn off the sync during development to save disk space
                sync_to_aws(s3_path=self.s3_bucket, local_path=self.data_path)  # Save to AWS

        thread_count = 3
        train_batch_threads = []
        test_batch_threads = []
        for i in range(thread_count):

            self.train_batches = queue.Queue(maxsize=10)
            train_batch_thread = Thread(
                name="Train batches",
                target=partial(self.get_batch,is_train=True),
                args=())
            train_batch_thread.start()
            train_batch_threads.append(train_batch_thread)

            self.test_batches = queue.Queue(maxsize=3)
            test_batch_thread = Thread(
                name="Test batches",
                target=partial(self.get_batch, is_train=False),
                args=())
            test_batch_thread.start()
            test_batch_threads.append(test_batch_thread)

        for epoch in range(self.start_epoch+1, self.start_epoch + self.n_epochs):
            prev_time = datetime.now()
            batch_count = self.record_reader.get_batches_per_epoch()
            for batch_id in range(batch_count):

                images, labels = self.train_batches.get()
                self.train_batches.task_done()

                train_feed_dict[x] = images
                train_feed_dict[y_] = labels
                sess.run(train_step,feed_dict=train_feed_dict)

                # Track speed to better compare GPUs and CPUs
                now = datetime.now()
                diff_seconds = (now - prev_time).total_seconds()
                if self.show_speed:
                    speed_results = 'batch {batch_id} of {total_batches}, {seconds} seconds'
                    speed_results = speed_results.format(batch_id=batch_id,
                                             seconds=diff_seconds,
                                             total_batches=batch_count)
                    if self.save_to_disk is True:
                        with open(self.speed_file, 'a') as f:
                            f.write(speed_results + '\n')
                    print(speed_results)
                prev_time = datetime.now()

            # TODO: Document and understand what RunOptions does
            run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
            run_opts_metadata = tf.RunMetadata()

            train_images, train_labels = self.train_batches.get()
            self.train_batches.task_done()
            train_feed_dict[x] = train_images
            train_feed_dict[y_] = train_labels
            train_summary, train_accuracy = sess.run([merged, optimization], feed_dict=train_feed_dict,
                                                     options=run_opts, run_metadata=run_opts_metadata)

            test_images, test_labels = self.train_batches.get()
            self.train_batches.task_done()
            test_feed_dict[x] = test_images
            test_feed_dict[y_] = test_labels
            test_summary, test_accuracy = sess.run([merged, optimization], feed_dict=test_feed_dict,
                                                   options=run_opts, run_metadata=run_opts_metadata)
            print(message.format(epoch, train_accuracy, test_accuracy))
            if self.save_to_disk is True:
                with open(self.results_file, 'a') as f:
                    f.write(message.format(epoch, train_accuracy, test_accuracy)+'\n')

                # Save a model checkpoint after every epoch
                self.save_model(sess,epoch=epoch)
                if self.s3_sync is True:  # You have the option to turn off the sync during development to save disk space
                    sync_to_aws(s3_path=self.s3_bucket, local_path=self.data_path)  # Save to AWS

    def save_model(self,sess,epoch):
        file_path = os.path.join(self.model_checkpoint_dir,'model')
        self.saver.save(sess,file_path,global_step=epoch)
        delete_old_model_backups(checkpoint_dir=self.model_checkpoint_dir)  # Delete all but latest backup to save space


def format_s3_bucket(s3_bucket):
    if not 's3://' in s3_bucket:
        return 's3://{s3_bucket}'.format(s3_bucket=s3_bucket)
    else:
        return s3_bucket


# This is helpful for profiling slow Tensorflow code
def create_tf_timeline(model_dir,run_metadata):
    tl = timeline.Timeline(run_metadata.step_stats)
    ctf = tl.generate_chrome_trace_format()
    timeline_file_path = os.path.join(model_dir,'timeline.json')
    with open(timeline_file_path, 'w') as f:
        f.write(ctf)


def parse_boolean_cli_args(args_value):
    parsed_value = None
    if isinstance(args_value, bool):
        parsed_value = args_value
    elif args_value.lower() in ['y', 'true']:
        parsed_value = True
    else:
        parsed_value = False
    return parsed_value


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("-d", "--datapath", required=False,
                    help="path to all of the data",
                    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data')
    ap.add_argument("-e", "--epochs", required=False,
                    help="quantity of batch iterations to run",
                    default='50')
    ap.add_argument("-c", "--model_dir", required=False,
                    help="location of checkpoint data",
                    default=None)
    ap.add_argument("-s", "--s3_bucket", required=False,
                    help="S3 backup URL",
                    default='self-driving-car')
    ap.add_argument("-a", "--show_speed", required=False,
                    help="Show speed in seconds",
                    default=False)
    ap.add_argument("-b", "--s3_sync", required=False,
                    help="Save on S3 storage by not syncing during code development",
                    default=False)
    ap.add_argument("--save_to_disk", required=False,
                    help="Default of 'no' avoids naming conflicts during local development when GPU is also running",
                    default=False)
    ap.add_argument(
        "--image_scale",
        required=False,
        help="How much to grow or shrink the image. Example: 0.0625 shrinks to 1/16 of original size",
        default=1.0)
    ap.add_argument(
        "--batch_size", required=False,
        help="Images per batch",
        default=False)
    args = vars(ap.parse_args())
    args['show_speed'] = parse_boolean_cli_args(args['show_speed'])
    if args['s3_sync']:
        args['s3_sync'] = parse_boolean_cli_args(args['s3_sync'])
    if args['save_to_disk']:
        args['save_to_disk'] = parse_boolean_cli_args(args['save_to_disk'])
    return args
