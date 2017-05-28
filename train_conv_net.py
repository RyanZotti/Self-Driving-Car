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

x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3])
y_ = tf.placeholder(tf.float32, shape=[None, 3])

W_conv1 = weight_variable([6, 6, 3, 16])
b_conv1 = bias_variable([16])
h_conv1 = tf.nn.relu(conv2d(x, W_conv1) + b_conv1)
dead_ReLUs1 = tf.placeholder(tf.float32,shape=[1])
h_pool1 = max_pool_2x2(h_conv1)

W_conv2 = weight_variable([6, 6, 16, 4])
b_conv2 = bias_variable([4])
h_conv2 = tf.nn.relu(conv2d(h_pool1, W_conv2) + b_conv2)
tf.histogram_summary('activations_layer_2', h_conv2)
h_pool2 = max_pool_2x2(h_conv2)

W_conv3 = weight_variable([6, 6, 4, 4])
b_conv3 = bias_variable([4])
h_conv3 = tf.nn.relu(conv2d(h_pool2, W_conv3) + b_conv3)
tf.histogram_summary('activations_layer_3', h_conv3)
h_pool3 = max_pool_2x2(h_conv3)

W_conv4 = weight_variable([6, 6, 4, 4])
b_conv4 = bias_variable([4])
h_conv4 = tf.nn.relu(conv2d(h_pool3, W_conv4) + b_conv4)
tf.histogram_summary('activations_layer_4', h_conv4)
h_pool4 = max_pool_2x2(h_conv4)

W_fc1 = weight_variable([15 * 20 * 4, 4])
b_fc1 = bias_variable([4])

h_pool4_flat = tf.reshape(h_pool4, [-1, 15 * 20 * 4])
h_fc1 = tf.nn.relu(tf.matmul(h_pool4_flat, W_fc1) + b_fc1)

dropout_keep_prob = tf.placeholder(tf.float32)
h_fc1_drop = tf.nn.dropout(h_fc1, dropout_keep_prob)

W_fc2 = weight_variable([4, 3])
b_fc2 = bias_variable([3])

y_conv=tf.nn.softmax(tf.matmul(h_fc1_drop, W_fc2) + b_fc2)

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y_conv), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(y_conv,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

trainer = Trainer(data_path=data_path, epochs=epochs, max_sample_records=250)
trainer.train(sess=sess, x=x, y_=y_,
              accuracy=accuracy,
              train_step=train_step,
              train_feed_dict={dropout_keep_prob:50},
              test_feed_dict={dropout_keep_prob:100})