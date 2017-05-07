import tensorflow as tf
import numpy as np
import argparse
from util import mkdir_tfboard_run_dir,mkdir,shell_command
from data_augmentation import process_data
import os
from Dataset import Dataset

# python train_mlp.py -d /root/data -b 1000
ap = argparse.ArgumentParser()
ap.add_argument("-d", "--datapath", required = False,
    help = "path to all of the data",
    default='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car')
ap.add_argument("-b", "--batches", required = False,
    help = "quantity of batch iterations to run",
    default='10000')
args = vars(ap.parse_args())
data_path = args["datapath"]
batch_iterations = int(args["batches"])

input_file_path = data_path+'/final_processed_data_3_channels.npz'
tfboard_basedir = mkdir(data_path+'/tf_visual_data/runs/')
tfboard_run_dir = mkdir_tfboard_run_dir(tfboard_basedir)
model_checkpoint_path = mkdir(tfboard_run_dir+'/trained_model')

sess = tf.InteractiveSession(config=tf.ConfigProto())

def weight_variable(shape):
    initial = tf.truncated_normal(shape, stddev=0.1)
    return tf.Variable(initial)

def bias_variable(shape):
    initial = tf.constant(0.1, shape=shape)
    return tf.Variable(initial)

x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3])
y_ = tf.placeholder(tf.float32, shape=[None, 3])

x_shaped = tf.reshape(x, [-1, 240 * 320 * 3])

W1 = weight_variable([240 * 320 * 3, 32])
b1 = bias_variable([32])
h1 = tf.sigmoid(tf.matmul(x_shaped, W1) + b1)

W2 = weight_variable([32, 3])
b2 = bias_variable([3])
y=tf.nn.softmax(tf.matmul(h1, W2) + b2)

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(y,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

# To view graph: tensorboard --logdir=/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs
tf.scalar_summary('accuracy', accuracy)
merged = tf.merge_all_summaries()

tfboard_basedir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/'
tfboard_run_dir = mkdir_tfboard_run_dir(tfboard_basedir)
train_dir = mkdir(tfboard_run_dir+"/trn/mlp/")
validation_dir = mkdir(tfboard_run_dir+"/vld/mlp/")

# Archive this script to document model design in event of good results that need to be replicated
model_file_path = os.path.dirname(os.path.realpath(__file__))+'/'+os.path.basename(__file__)
shell_command('cp {model_file} {archive_path}'.format(model_file=model_file_path,archive_path=tfboard_run_dir+'/'))

train_writer = tf.train.SummaryWriter(train_dir,sess.graph)
validation_writer = tf.train.SummaryWriter(validation_dir,sess.graph)

sess.run(tf.initialize_all_variables())

dataset = Dataset(input_file_path=data_path+'/data')
#tf_summarizer = TfSummarizer(sess, train_writer, validation_writer, merged, accuracy, x, y_, dataset)
#train_accuracy, validation_accuracy = tf_summarizer.summarize(epoch=0)

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

for epoch in range(10):
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
    print("epoch: {0}, training accuracy: {1}, validation accuracy: {2}".format(epoch, train_accuracy, test_accuracy))

# Save the trained model to a file
saver = tf.train.Saver()
save_path = saver.save(sess, tfboard_run_dir+"/model.ckpt")

# Marks unambiguous successful completion to prevent deletion by cleanup script
shell_command('touch '+tfboard_run_dir+'/SUCCESS')