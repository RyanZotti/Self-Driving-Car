import tensorflow as tf
import numpy as np
import argparse
from util import (mkdir_tfboard_run_dir,mkdir,shell_command,
                  shuffle_dataset, dead_ReLU_pct, custom_summary)
import os

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

# python3 /root/Self-Driving-Car/train_1x1_conv_net.py -d /root -b 1400
ap = argparse.ArgumentParser()
ap.add_argument("-d", "--datapath", required = False,
    help = "path to all of the data",
    default='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car')
ap.add_argument("-b", "--batches", required = False,
    help = "quantity of batch iterations to run",
    default='1000')
args = vars(ap.parse_args())
data_path = args["datapath"]
batch_iterations = int(args["batches"])

input_file_path = data_path+'/data_115.npz'
tfboard_basedir = mkdir(data_path+'/tf_visual_data/runs/')
tfboard_run_dir = mkdir_tfboard_run_dir(tfboard_basedir)
model_checkpoint_path = mkdir(tfboard_run_dir+'/trained_model')

npzfile = np.load(input_file_path)

# training data
train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']
train_predictors, train_targets = shuffle_dataset(train_predictors, train_targets)

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

x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3])
y_ = tf.placeholder(tf.float32, shape=[None, 3])

W_conv1 = weight_variable([6, 6, 3, 64])
b_conv1 = bias_variable([64])
h_conv1 = tf.tanh(conv2d(x, W_conv1) + b_conv1)
dead_ReLUs1 = tf.placeholder(tf.float32,shape=[1])
h_pool1 = max_pool_2x2(h_conv1)

W_conv2 = weight_variable([1, 1, 64, 4])
b_conv2 = bias_variable([4])
h_conv2 = tf.tanh(conv2d(h_pool1, W_conv2) + b_conv2)
tf.histogram_summary('activations_layer_2', h_conv2)
h_pool2 = max_pool_2x2(h_conv2)

W_conv3 = weight_variable([6, 6, 4, 4])
b_conv3 = bias_variable([4])
h_conv3 = tf.tanh(conv2d(h_pool2, W_conv3) + b_conv3)
tf.histogram_summary('activations_layer_3', h_conv3)
h_pool3 = max_pool_2x2(h_conv3)

W_conv4 = weight_variable([6, 6, 4, 4])
b_conv4 = bias_variable([4])
h_conv4 = tf.tanh(conv2d(h_pool3, W_conv4) + b_conv4)
tf.histogram_summary('activations_layer_4', h_conv4)
h_pool4 = max_pool_2x2(h_conv4)

W_fc1 = weight_variable([15 * 20 * 4, 4])
b_fc1 = bias_variable([4])

h_pool4_flat = tf.reshape(h_pool4, [-1, 15 * 20 * 4])
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

# My filters look random, but apparently other people get random-looking filters too (https://github.com/tensorflow/tensorflow/issues/908)
W_conv1_transposed = tf.transpose(W_conv1, [3, 0, 1, 2]) # I think this means make the batch the first dimension
W_conv1_visual_summary = tf.image_summary("W_conv1",W_conv1_transposed,max_images=5000)

tf_ReLU_layers = [h_conv1]

# To view graph: tensorboard --logdir=/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/1/
tf.scalar_summary('accuracy', accuracy)
merged = tf.merge_all_summaries()


train_dir = mkdir(tfboard_run_dir+"/trn/convnet/")
train_activation_layer_1 = mkdir(tfboard_run_dir+"/trn_actvtn_lyr1")
train_activation_layer_2 = mkdir(tfboard_run_dir+"/trn_actvtn_lyr2")
train_activation_layer_3 = mkdir(tfboard_run_dir+"/trn_actvtn_lyr3")
train_activation_layer_4 = mkdir(tfboard_run_dir+"/trn_actvtn_lyr4")

validation_dir = mkdir(tfboard_run_dir+"/vld/convnet/")

# Archive this script to document model design in event of good results that need to be replicated
model_file_path = os.path.dirname(os.path.realpath(__file__))+'/'+os.path.basename(__file__)
shell_command('cp {model_file} {archive_path}'.format(model_file=model_file_path,archive_path=tfboard_run_dir+'/'))

train_writer = tf.train.SummaryWriter(train_dir,sess.graph)
validation_writer = tf.train.SummaryWriter(validation_dir,sess.graph)

validation_predictors[:1000] = validation_predictors[:1000] / 255

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

        validation_feed = {x: validation_predictors[:100], y_: validation_targets[:100], keep_prob: 1.0}
        validation_summary, validation_accuracy = sess.run([merged, accuracy],
                                                 feed_dict=validation_feed,
                                                 options=run_opts,
                                                 run_metadata=run_opts_metadata)
        validation_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        validation_writer.add_summary(validation_summary, i)

        ReLU_layers = sess.run(tf_ReLU_layers,feed_dict=train_feed)
        for layer_index, ReLU_layer in enumerate(ReLU_layers):
            dead_ReLU_percentage = dead_ReLU_pct(ReLU_layer)
            relu_summary_str = "dead_ReLUs_layer"+str(layer_index+1)
            summary = custom_summary(relu_summary_str,dead_ReLU_percentage)
            train_writer.add_summary(summary,i)

        print("{i} training accuracy: {train_acc}, validation accuracy: {validation_acc}".format(train_acc=train_accuracy,validation_acc=validation_accuracy,i=i))


    train_step.run(feed_dict={x: predictors, y_: target, keep_prob: 0.5})

# Save the trained model to a file
saver = tf.train.Saver()
save_path = saver.save(sess, model_checkpoint_path+"/model.ckpt")
#print("validation accuracy %g" % accuracy.eval(feed_dict={x: validation_predictors, y_: validation_targets, keep_prob: 1.0}))

# Marks unambiguous successful completion to prevent deletion by cleanup script
shell_command('touch '+tfboard_run_dir+'/SUCCESS')
