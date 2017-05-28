import tensorflow as tf
import argparse
from Trainer import Trainer

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
ap.add_argument("-d", "--datapath", required = False,
    help = "path to all of the data",
    default='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car')
ap.add_argument("-e", "--epochs", required = False,
    help = "quantity of batch iterations to run",
    default='50')
args = vars(ap.parse_args())
data_path = args["datapath"]
epochs = args["epochs"]

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

dropout_keep_prob = tf.placeholder(tf.float32)
h_fc1_drop = tf.nn.dropout(h_fc1, dropout_keep_prob)

W_fc2 = weight_variable([4, 3])
b_fc2 = bias_variable([3])

y_conv=tf.nn.softmax(tf.matmul(h_fc1_drop, W_fc2) + b_fc2)


cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y_conv), reduction_indices=[1]))

'''
    https://github.com/tensorflow/tensorflow/blob/master/tensorflow/contrib/layers/python/layers/layers.py#L396
    From the official TensorFlow docs:

        Note: When is_training is True the moving_mean and moving_variance need to be
        updated, by default the update_ops are placed in `tf.GraphKeys.UPDATE_OPS` so
        they need to be added as a dependency to the `train_op`, example:

            update_ops = tf.get_collection(tf.GraphKeys.UPDATE_OPS)
            with tf.control_dependencies(update_ops):
              train_op = optimizer.minimize(loss)

    https://www.tensorflow.org/api_docs/python/tf/Graph#control_dependencies
    Regarding tf.control_dependencies:

        with g.control_dependencies([a, b, c]):
          # `d` and `e` will only run after `a`, `b`, and `c` have executed.
          d = ...
          e = ...

'''
update_ops = tf.get_collection(tf.GraphKeys.UPDATE_OPS)
with tf.control_dependencies(update_ops):
    train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)

correct_prediction = tf.equal(tf.argmax(y_conv,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

trainer = Trainer(data_path=data_path, epochs=epochs, max_sample_records=100)
trainer.train(sess=sess, x=x, y_=y_,
              accuracy=accuracy,
              train_step=train_step,
              train_feed_dict={dropout_keep_prob:0.5, 'phase:0': True},
              test_feed_dict={dropout_keep_prob:1.0})
