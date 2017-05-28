import tensorflow as tf
import argparse
from Trainer import Trainer

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

x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3])
y_ = tf.placeholder(tf.float32, shape=[None, 3])

x_shaped = tf.reshape(x, [-1, 240 * 320 * 3])

W = tf.Variable(tf.zeros([240 * 320 * 3, 3]))
b = tf.Variable(tf.zeros([3]))
y = tf.nn.softmax(tf.matmul(x_shaped, W) + b)

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(y,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

trainer = Trainer(data_path=data_path,
                  epochs=epochs,
                  max_sample_records=1000)

trainer.train(sess=sess, x=x, y_=y_,
              accuracy=accuracy,
              train_step=train_step,
              train_feed_dict={},
              test_feed_dict={})