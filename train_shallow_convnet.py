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

W_conv1 = weight_variable('layer1',[6, 6, 3, 32])
b_conv1 = bias_variable('layer1',[32])
h_conv1 = tf.nn.relu(conv2d(x, W_conv1) + b_conv1)
h_pool1 = max_pool_2x2(h_conv1)

W_fc1 = weight_variable('layer2',[120 * 160 * 32, 512])
b_fc1 = bias_variable('layer2',[512])

h_pool1_flat = tf.reshape(h_pool1, [-1, 120 * 160 * 32])
h_fc1 = tf.nn.relu(tf.matmul(h_pool1_flat, W_fc1) + b_fc1)

dropout_keep_prob = tf.placeholder(tf.float32)
h_fc1_drop = tf.nn.dropout(h_fc1, dropout_keep_prob)

W_fc2 = weight_variable('layer3',[512, 3])
b_fc2 = bias_variable('layer3',[3])

logits = tf.add(tf.matmul(h_fc1_drop, W_fc2), b_fc2, name='logits')

cross_entropy = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=logits, labels=y_))
train_step = tf.train.AdamOptimizer(1e-4,name='train_step').minimize(cross_entropy)
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
              train_feed_dict={dropout_keep_prob:1.0},
              test_feed_dict={dropout_keep_prob:1.0})