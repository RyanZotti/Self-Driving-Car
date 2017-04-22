import argparse
import os

import numpy as np
import tensorflow as tf

from data_augmentation import flip_enrichment
from util import (mkdir_tfboard_run_dir, mkdir, shell_command,
                  shuffle_dataset)

'''
Helpful notes
- Excellent source explaining convoluted neural networks:
  http://cs231n.github.io/convolutional-networks/
- Output size of a conv layer is computed by (W−F+2P)/S+1
  W = input volumne size
  F = field size of conv neuron
  S = stride size
  P = zero padding size
(240-6+2)/2=118
(320-6+2)/2=158
(28-5+2)/2
'''

# GPU: python train_conv_net.py -p /root/data -b 1000
# Laptop: python train_conv_net.py -p /Users/ryanzotti/Documents/repos/Self_Driving_RC_Car -b 1000 -f y -d y
ap = argparse.ArgumentParser()
ap.add_argument("-p", "--datapath", required = False,
    help = "path to all of the data",
    default='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car')
ap.add_argument("-b", "--batches", required = False,
    help = "quantity of batch iterations to run",
    default='1000')
ap.add_argument("-f", "--flip", required = False,
    help = "Increase training size by flipping left and right images",
    default='y')
ap.add_argument("-d", "--debug", required = False,
    help = "Print more details for easier debugging",
    default='n')
args = vars(ap.parse_args())
data_path = args["datapath"]
batch_iterations = int(args["batches"])
perform_image_flipping = True if args["flip"].lower() == 'y' else False
debug_mode = True if args["debug"].lower() == 'y' else False

input_file_path = data_path+'/final_processed_data_3_channels.npz'
tfboard_basedir = mkdir(data_path+'/tf_visual_data/runs/')
tfboard_run_dir = mkdir_tfboard_run_dir(tfboard_basedir)
model_checkpoint_path = mkdir(tfboard_run_dir+'/trained_model')

npzfile = np.load(input_file_path)

# training data
train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']

# validation/test data
validation_predictors = npzfile['validation_predictors']
validation_targets = npzfile['validation_targets']
validation_predictors, validation_targets = shuffle_dataset(validation_predictors, validation_targets)


sess = tf.InteractiveSession(config=tf.ConfigProto())

def weight_variable(shape):
    initial = tf.truncated_normal(shape, stddev=0.1)
    return tf.Variable(initial)

def bias_variable(shape):
    initial = tf.constant(0.1, shape=shape)
    return tf.Variable(initial)

def conv2d(x, W):
    return tf.nn.conv2d(x, W, strides=[1, 1, 1, 1], padding='SAME')

def max_pool_2x2(x):
    return tf.nn.max_pool(x, ksize=[1, 2, 2, 1],
                          strides=[1, 2, 2, 1], padding='SAME')

def batch_norm_conv_layer(input, weight_shape, phase):
    W_conv = weight_variable(weight_shape)
    b_conv = bias_variable([weight_shape[-1]])
    h_conv = conv2d(input, W_conv) + b_conv
    is_training = True if phase is not None else False
    #h1 = tf.contrib.layers.fully_connected(h_conv, 100, activation_fn=None, scope='dense')
    h2 = tf.contrib.layers.batch_norm(h_conv,
                                      center=True, scale=True,
                                      is_training=is_training)
    return max_pool_2x2(tf.nn.relu(h2))


x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3])
y_ = tf.placeholder(tf.float32, shape=[None, 3])
phase = tf.placeholder(tf.bool, name='phase')

conv1 = batch_norm_conv_layer(x, [6, 6, 3, 16], phase)
conv2 = batch_norm_conv_layer(conv1, [6, 6, 16, 4], phase)
conv3 = batch_norm_conv_layer(conv2, [6, 6, 4, 4], phase)
conv4 = batch_norm_conv_layer(conv3, [6, 6, 4, 4], phase)

W_fc1 = weight_variable([15 * 20 * 4, 4])
b_fc1 = bias_variable([4])

h_pool4_flat = tf.reshape(conv4, [-1, 15 * 20 * 4])
h_fc1 = tf.nn.relu(tf.matmul(h_pool4_flat, W_fc1) + b_fc1)

keep_prob = tf.placeholder(tf.float32)
h_fc1_drop = tf.nn.dropout(h_fc1, keep_prob)

W_fc2 = weight_variable([4, 3])
b_fc2 = bias_variable([3])

y_conv=tf.nn.softmax(tf.matmul(h_fc1_drop, W_fc2) + b_fc2)

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y_conv), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(y_conv,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

# To view graph: tensorboard --logdir=/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/1/
tf.scalar_summary('accuracy', accuracy)
merged = tf.merge_all_summaries()


train_dir = mkdir(tfboard_run_dir+"/trn/convnet/")

validation_dir = mkdir(tfboard_run_dir+"/vld/convnet/")

# Archive this script to document model design in event of good results that need to be replicated
model_file_path = os.path.dirname(os.path.realpath(__file__))+'/'+os.path.basename(__file__)
shell_command('cp {model_file} {archive_path}'.format(model_file=model_file_path,archive_path=tfboard_run_dir+'/'))

train_writer = tf.train.SummaryWriter(train_dir,sess.graph)
validation_writer = tf.train.SummaryWriter(validation_dir,sess.graph)

validation_predictors[:200] = validation_predictors[:200] / 255

sess.run(tf.initialize_all_variables())
batch_index = 0
batches_per_epoch = (train_predictors.shape[0] - train_predictors.shape[0] % 50)/50
for i in range(batch_iterations):

    # Shuffle in the very beginning and after each epoch
    if batch_index % batches_per_epoch == 0:
        train_predictors, train_targets = shuffle_dataset(train_predictors, train_targets)
        batch_index = 0
    batch_index += 1

    data_index = batch_index * 50
    predictors = train_predictors[data_index:data_index+50]
    target = train_targets[data_index:data_index+50]

    if perform_image_flipping and debug_mode:
        pre_flip_count = len(target)
        predictors, target = flip_enrichment(predictors,target)
        post_flip_count = len(target)
        msg = 'Pre-flip count: {0}, post-flip count: {1}'.format(pre_flip_count,post_flip_count)
        print(msg)

    predictors = predictors / 255

    if i%425 == 0:

        # Not sure what these two lines do
        run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
        run_opts_metadata = tf.RunMetadata()
        train_feed = {x: predictors, y_: target, keep_prob: 1.0}
        train_summary, train_accuracy = sess.run([merged, accuracy],
                              feed_dict=train_feed,
                              options=run_opts,
                              run_metadata=run_opts_metadata)
        train_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        train_writer.add_summary(train_summary, i)

        validation_feed = {x: validation_predictors[:200], y_: validation_targets[:200], keep_prob: 1.0}
        validation_summary, validation_accuracy = sess.run([merged, accuracy],
                                                 feed_dict=validation_feed,
                                                 options=run_opts,
                                                 run_metadata=run_opts_metadata)
        validation_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        validation_writer.add_summary(validation_summary, i)

        print("{i} training accuracy: {train_acc}, validation accuracy: {validation_acc}".format(train_acc=train_accuracy,validation_acc=validation_accuracy,i=i))


    train_step.run(feed_dict={x: predictors, y_: target, keep_prob: 0.5})

# Save the trained model to a file
saver = tf.train.Saver()
save_path = saver.save(sess, model_checkpoint_path+"/model.ckpt")
#print("validation accuracy %g" % accuracy.eval(feed_dict={x: validation_predictors, y_: validation_targets, keep_prob: 1.0}))

# Marks unambiguous successful completion to prevent deletion by cleanup script
shell_command('touch '+tfboard_run_dir+'/SUCCESS')
