import tensorflow as tf
import argparse
from util import mkdir_tfboard_run_dir,mkdir,shell_command
from data_augmentation import process_data
import os
from Dataset import Dataset


class Trainer:

    def __init__(self, data_path, epochs=50):
        self.data_path = data_path
        self.epochs = int(epochs)
        tfboard_basedir = mkdir(data_path+'/tf_visual_data/runs/')
        tfboard_run_dir = mkdir_tfboard_run_dir(tfboard_basedir)
        model_checkpoint_path = mkdir(tfboard_run_dir+'/trained_model')

    # Assumes all models have these same inputs
    def train(self, sess, x, y_, accuracy, train_step):

        # To view graph: tensorboard --logdir=/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs
        tf.scalar_summary('accuracy', accuracy)
        merged = tf.merge_all_summaries()

        tfboard_basedir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/'
        tfboard_run_dir = mkdir_tfboard_run_dir(tfboard_basedir)

        # Archive this script to document model design in event of good results that need to be replicated
        model_file_path = os.path.dirname(os.path.realpath(__file__)) + '/' + os.path.basename(__file__)
        shell_command(
            'cp {model_file} {archive_path}'.format(model_file=model_file_path, archive_path=tfboard_run_dir + '/'))

        sess.run(tf.initialize_all_variables())

        dataset = Dataset(input_file_path=os.path.join(self.data_path, 'data'))

        # Not sure what these two lines do
        run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
        run_opts_metadata = tf.RunMetadata()

        train_images, train_labels = process_data(dataset.get_sample(train=True))
        train_summary, train_accuracy = sess.run([merged, accuracy], feed_dict={x: train_images, y_: train_labels},
                                                 options=run_opts, run_metadata=run_opts_metadata)
        test_images, test_labels = process_data(dataset.get_sample(train=False))
        test_summary, test_accuracy = sess.run([merged, accuracy], feed_dict={x: test_images, y_: test_labels},
                                               options=run_opts, run_metadata=run_opts_metadata)
        print("epoch: {0}, training accuracy: {1}, validation accuracy: {2}".format(-1, train_accuracy, test_accuracy))

        for epoch in range(self.epochs):
            train_batches = dataset.get_batches(train=True)
            for batch in train_batches:
                images, labels = process_data(batch)
                train_step.run(feed_dict={x: images, y_: labels})

            # TODO: remove all this hideous boilerplate
            run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
            run_opts_metadata = tf.RunMetadata()
            train_images, train_labels = process_data(dataset.get_sample(train=True))
            train_summary, train_accuracy = sess.run([merged, accuracy], feed_dict={x: train_images, y_: train_labels},
                                                     options=run_opts, run_metadata=run_opts_metadata)
            test_images, test_labels = process_data(dataset.get_sample(train=False))
            test_summary, test_accuracy = sess.run([merged, accuracy], feed_dict={x: test_images, y_: test_labels},
                                                   options=run_opts, run_metadata=run_opts_metadata)
            print(
                "epoch: {0}, training accuracy: {1}, validation accuracy: {2}".format(epoch, train_accuracy, test_accuracy))

        # Save the trained model to a file
        saver = tf.train.Saver()
        save_path = saver.save(sess, tfboard_run_dir + "/model.ckpt")

        # Marks unambiguous successful completion to prevent deletion by cleanup script
        shell_command('touch ' + tfboard_run_dir + '/SUCCESS')