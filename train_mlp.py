import tensorflow as tf
from Trainer import Trainer, parse_args
import os
from model import *


data_path, epochs = parse_args()

sess = tf.InteractiveSession(config=tf.ConfigProto())

x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3])
y_ = tf.placeholder(tf.float32, shape=[None, 3])

x_shaped = tf.reshape(x, [-1, 240 * 320 * 3])

W1 = weight_variable('layer1',[240 * 320 * 3, 32])
b1 = bias_variable('layer1',[32])
h1 = tf.tanh(tf.matmul(x_shaped, W1) + b1)

W2 = weight_variable('layer2',[32, 32])
b2 = bias_variable('layer2',[32])
h2 = tf.tanh(tf.matmul(h1, W2) + b2)

W3 = weight_variable('layer3',[32, 3])
b3 = bias_variable('layer3',[3])
pred=tf.matmul(h2, W3) + b3

cross_entropy = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=pred, labels=y_))
train_step = tf.train.AdamOptimizer(1e-5).minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(pred,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

model_file = os.path.dirname(os.path.realpath(__file__)) + '/' + os.path.basename(__file__)
trainer = Trainer(data_path=data_path,
                  model_file=model_file,
                  epochs=epochs,
                  max_sample_records=1000)

trainer.train(sess=sess, x=x, y_=y_,
              accuracy=accuracy,
              train_step=train_step,
              train_feed_dict={},
              test_feed_dict={})