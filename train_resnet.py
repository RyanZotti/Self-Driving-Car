from collections import namedtuple
import tensorflow as tf
from Trainer import Trainer, parse_args
import os
from model import *


args = parse_args()
data_path = args["datapath"]
epochs = args["epochs"]
s3_bucket = args['s3_bucket']
show_speed = args['show_speed']
s3_sync = args['s3_sync']

sess = tf.InteractiveSession(config=tf.ConfigProto())

n_target_classes = 3

x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3], name='x')
y_ = tf.placeholder(tf.float32, shape=[None, 3], name='y_')

# I got most of the code from here:
# https://github.com/tensorflow/tensorflow/blob/master/tensorflow/examples/learn/resnet.py

"""Builds a residual network."""

# Configurations for each bottleneck group.
BottleneckGroup = namedtuple('BottleneckGroup',
                           ['num_blocks', 'num_filters', 'bottleneck_size'])
groups = [
  BottleneckGroup(3, 32, 8), BottleneckGroup(3, 32, 8),
  BottleneckGroup(3, 32, 8), BottleneckGroup(3, 32, 8)
]

# First convolution expands to 64 channels
with tf.variable_scope('conv_layer1'):
    net = tf.layers.conv2d(
        x,
        filters=32,
        kernel_size=7,
        activation=tf.nn.relu)
    net = tf.layers.batch_normalization(net)

# Max pool
net = tf.layers.max_pooling2d(
    net, pool_size=3, strides=2, padding='same')

# First chain of resnets
with tf.variable_scope('conv_layer2'):
    net = tf.layers.conv2d(
        net,
        filters=groups[0].num_filters,
        kernel_size=1,
        padding='valid')

# Create the bottleneck groups, each of which contains `num_blocks`
# bottleneck groups.
for group_i, group in enumerate(groups):
    for block_i in range(group.num_blocks):
        name = 'group_%d/block_%d' % (group_i, block_i)

        # 1x1 convolution responsible for reducing dimension
        with tf.variable_scope(name + '/conv_in'):
          conv = tf.layers.conv2d(
              net,
              filters=group.num_filters,
              kernel_size=1,
              padding='valid',
              activation=tf.nn.relu)
          conv = tf.layers.batch_normalization(conv)

        with tf.variable_scope(name + '/conv_bottleneck'):
          conv = tf.layers.conv2d(
              conv,
              filters=group.bottleneck_size,
              kernel_size=3,
              padding='same',
              activation=tf.nn.relu)
          conv = tf.layers.batch_normalization(conv)

        # 1x1 convolution responsible for restoring dimension
        with tf.variable_scope(name + '/conv_out'):
          input_dim = net.get_shape()[-1].value
          conv = tf.layers.conv2d(
              conv,
              filters=input_dim,
              kernel_size=1,
              padding='valid',
              activation=tf.nn.relu)
          conv = tf.layers.batch_normalization(conv)

        # shortcut connections that turn the network into its counterpart
        # residual function (identity shortcut)
        net = conv + net

    try:
      # upscale to the next group size
      next_group = groups[group_i + 1]
      with tf.variable_scope('block_%d/conv_upscale' % group_i):
        net = tf.layers.conv2d(
            net,
            filters=next_group.num_filters,
            kernel_size=1,
            padding='same',
            activation=None,
            bias_initializer=None)
    except IndexError:
      pass

net_shape = net.get_shape().as_list()
net = tf.nn.avg_pool(
  net,
  ksize=[1, net_shape[1], net_shape[2], 1],
  strides=[1, 1, 1, 1],
  padding='VALID')

net_shape = net.get_shape().as_list()
net = tf.reshape(net, [-1, net_shape[1] * net_shape[2] * net_shape[3]])

# Compute logits (1 per class)
logits = tf.layers.dense(net, n_target_classes, activation=None,name='logits')

cross_entropy = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=logits, labels=y_))
train_step = tf.train.AdamOptimizer(1e-5,name='train_step').minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(logits,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32),name='accuracy')

model_file = os.path.dirname(os.path.realpath(__file__)) + '/' + os.path.basename(__file__)
trainer = Trainer(data_path=data_path,
                  model_file=model_file,
                  s3_bucket=s3_bucket,
                  epochs=epochs,
                  max_sample_records=100,
                  show_speed=show_speed,
                  s3_sync=s3_sync)

trainer.train(sess=sess, x=x, y_=y_,
              accuracy=accuracy,
              train_step=train_step,
              train_feed_dict={},
              test_feed_dict={})