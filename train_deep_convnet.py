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

W_conv1 = weight_variable('layer1',[6, 6, 3, 24])
b_conv1 = bias_variable('layer1',[24])
h_conv1 = tf.nn.relu(conv2d(x, W_conv1) + b_conv1)
h_pool1 = max_pool_2x2(h_conv1)

W_conv2 = weight_variable('layer2',[6, 6, 24, 24])
b_conv2 = bias_variable('layer2',[24])
h_conv2 = tf.nn.relu(conv2d(h_pool1, W_conv2) + b_conv2)

W_conv3 = weight_variable('layer3',[6, 6, 24, 36])
b_conv3 = bias_variable('layer3',[36])
h_conv3 = tf.nn.relu(conv2d(h_conv2, W_conv3) + b_conv3)
h_pool3 = max_pool_2x2(h_conv3)

W_conv4 = weight_variable('layer4',[6, 6, 36, 36])
b_conv4 = bias_variable('layer4',[36])
h_conv4 = tf.nn.relu(conv2d(h_pool3, W_conv4) + b_conv4)

W_conv5 = weight_variable('layer5',[6, 6, 36, 48])
b_conv5 = bias_variable('layer5',[48])
h_conv5 = tf.nn.relu(conv2d(h_conv4, W_conv5) + b_conv5)
h_pool5 = max_pool_2x2(h_conv5)

W_conv6 = weight_variable('layer6',[6, 6, 48, 64])
b_conv6 = bias_variable('layer6',[64])
h_conv6 = tf.nn.relu(conv2d(h_pool5, W_conv6) + b_conv6)

W_conv7 = weight_variable('layer7',[6, 6, 64, 64])
b_conv7 = bias_variable('layer7',[64])
h_conv7 = tf.nn.relu(conv2d(h_conv6, W_conv7) + b_conv7)
h_pool7 = max_pool_2x2(h_conv6)

h_pool7_flat = tf.reshape(h_pool7, [-1, 15 * 20 * 64])
W_fc1 = weight_variable('layer8',[15 * 20 * 64, 512])
b_fc1 = bias_variable('layer8',[512])
h_fc1 = tf.nn.relu(tf.matmul(h_pool7_flat, W_fc1) + b_fc1)

W_fc2 = weight_variable('layer9',[512, 256])
b_fc2 = bias_variable('layer9',[256])
h_fc2 = tf.nn.relu(tf.matmul(h_fc1, W_fc2) + b_fc2)

W_fc3 = weight_variable('layer10',[256, 128])
b_fc3 = bias_variable('layer10',[128])
h_fc3 = tf.nn.relu(tf.matmul(h_fc2, W_fc3) + b_fc3)

W_fc4 = weight_variable('layer11',[128, 64])
b_fc4 = bias_variable('layer11',[64])
h_fc4 = tf.nn.relu(tf.matmul(h_fc3, W_fc4) + b_fc4)

dropout_keep_prob = tf.placeholder(tf.float32)
h_fc1_drop = tf.nn.dropout(h_fc4, dropout_keep_prob)

W_fc4 = weight_variable('layer12',[64, 3])
b_fc4 = bias_variable('layer12',[3])
logits = tf.add(tf.matmul(h_fc4, W_fc4), b_fc4, name='logits')

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
              train_feed_dict={dropout_keep_prob:0.5},
              test_feed_dict={dropout_keep_prob:1.0})