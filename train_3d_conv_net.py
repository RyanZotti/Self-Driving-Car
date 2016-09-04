import tensorflow as tf
import numpy as np
import random
from util import multiple_random_windows_from_random_sessions as random_windows

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

data_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
window_size = 50 # full size before it is potentially hollowed out. See actual_window_size for true size
window_count = 50
hollow_window = True
actual_window_size = window_size
if hollow_window:
    actual_window_size = 2
validation_predictors, validation_targets = random_windows(data_path,window_size,window_count,hollow_window)

sess = tf.InteractiveSession(config=tf.ConfigProto())

def weight_variable(shape):
    initial = tf.truncated_normal(shape, stddev=0.1)
    return tf.Variable(initial)

def bias_variable(shape):
    initial = tf.constant(0.1, shape=shape)
    return tf.Variable(initial)

def conv3d(x, W):
    return tf.nn.conv3d(x, W, strides=[1, 1, 1, 1, 1], padding='SAME')

def max_pool_2x2(x):
    return tf.nn.max_pool(x, ksize=[1, 2, 2, 1],
                          strides=[1, 2, 2, 1], padding='SAME')

x = tf.placeholder(tf.float32, shape=[None, actual_window_size, 240, 320, 3])
y_ = tf.placeholder(tf.float32, shape=[None, 3])

W_conv1 = weight_variable([2, 3, 3, 3, 16])
b_conv1 = bias_variable([16])
h_conv1 = tf.nn.relu(conv3d(x, W_conv1) + b_conv1)

W_conv2 = weight_variable([2, 3, 3, 16, 4])
b_conv2 = bias_variable([4])
h_conv2 = tf.nn.relu(conv3d(h_conv1, W_conv2) + b_conv2)

W_fc1 = weight_variable([actual_window_size * 240 * 320 * 4, 4])
b_fc1 = bias_variable([4])

h_pool4_flat = tf.reshape(h_conv2, [-1, actual_window_size * 240 * 320 * 4])
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
tfboard_dir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/4/'
train_writer = tf.train.SummaryWriter(tfboard_dir+"/train/",sess.graph)
validation_writer = tf.train.SummaryWriter(tfboard_dir+"/validation/",sess.graph)

sess.run(tf.initialize_all_variables())
for i in range(1000):

    # creates a new sample every iteration
    train_predictors, train_targets = random_windows(data_path, window_size, window_count, hollow_window)

    if i%425 == 0:

        # Not sure what these two lines do
        run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
        run_opts_metadata = tf.RunMetadata()


        train_feed = {x: train_predictors, y_: train_targets, keep_prob: 1.0}
        train_summary, train_accuracy = sess.run([merged, accuracy],feed_dict=train_feed,options=run_opts,
                                                 run_metadata=run_opts_metadata)
        train_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        train_writer.add_summary(train_summary, i)

        validation_feed = {x: validation_predictors, y_: validation_targets, keep_prob: 1.0}
        validation_summary, validation_accuracy = sess.run([merged, accuracy],feed_dict=validation_feed,options=run_opts,
                                                 run_metadata=run_opts_metadata)
        validation_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        validation_writer.add_summary(validation_summary, i)

        print("{i} training accuracy: {train_acc}, validation accuracy: {validation_acc}".format(train_acc=train_accuracy,validation_acc=validation_accuracy,i=i))

    train_step.run(feed_dict={x: train_predictors, y_: train_targets, keep_prob: 0.5})

# Save the trained model to a file
saver = tf.train.Saver()
save_path = saver.save(sess, "/Users/ryanzotti/Documents/repos/Self-Driving-Car/trained_model/model.ckpt")
