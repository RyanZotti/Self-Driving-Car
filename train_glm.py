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

x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3], name='x')
y_ = tf.placeholder(tf.float32, shape=[None, 3], name='y_')

x_shaped = tf.reshape(x, [-1, 240 * 320 * 3])

W = weight_variable('layer1',[240 * 320 * 3, 3])
b = bias_variable('layer1',[3])
logits = tf.add(tf.matmul(x_shaped, W), b, name='logits')
y = tf.nn.softmax(logits)

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-4,name='train_step').minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(y,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32),name='accuracy')

model_file = os.path.dirname(os.path.realpath(__file__)) + '/' + os.path.basename(__file__)
trainer = Trainer(data_path=data_path,
                  model_file=model_file,
                  s3_bucket=s3_bucket,
                  epochs=epochs,
                  max_sample_records=1000,
                  show_speed=show_speed,
                  s3_sync=s3_sync)

trainer.train(sess=sess, x=x, y_=y_,
              accuracy=accuracy,
              train_step=train_step,
              train_feed_dict={},
              test_feed_dict={})