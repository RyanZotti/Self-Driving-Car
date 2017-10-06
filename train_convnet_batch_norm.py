import tensorflow as tf
from Trainer import Trainer, parse_args
import os
from model import *

# I think I got my batch norm code from here: https://github.com/RuiShu/micro-projects/blob/master/tf-batchnorm-guide/batchnorm_guide.ipynb

args = parse_args()
data_path = args["datapath"]
epochs = args["epochs"]
s3_bucket = args['s3_bucket']
show_speed = args['show_speed']
s3_sync = args['s3_sync']

sess = tf.InteractiveSession(config=tf.ConfigProto())

x = tf.placeholder(tf.float32, shape=[None, 240, 320, 3], name='x')
y_ = tf.placeholder(tf.float32, shape=[None, 3], name='y_')
phase = tf.placeholder(tf.bool, name='phase')

conv1 = batch_norm_conv_layer('layer1', x, [6, 6, 3, 16], phase)
conv2 = batch_norm_conv_layer('layer2',conv1, [6, 6, 16, 4], phase)
conv3 = batch_norm_conv_layer('layer3',conv2, [6, 6, 4, 4], phase)
conv4 = batch_norm_conv_layer('layer4',conv3, [6, 6, 4, 4], phase)

W_fc1 = weight_variable('layer5',[15 * 20 * 4, 4])
b_fc1 = bias_variable('layer5',[4])

h_pool4_flat = tf.reshape(conv4, [-1, 15 * 20 * 4])
h_fc1 = tf.nn.relu(tf.matmul(h_pool4_flat, W_fc1) + b_fc1)

dropout_keep_prob = tf.placeholder(tf.float32)
h_fc1_drop = tf.nn.dropout(h_fc1, dropout_keep_prob)

W_fc2 = weight_variable('layer6',[4, 3])
b_fc2 = bias_variable('layer6',[3])
logits = tf.add(tf.matmul(h_fc1_drop, W_fc2), b_fc2, name='logits')

cross_entropy = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=logits, labels=y_))
train_step = tf.train.AdamOptimizer(1e-5,name='train_step').minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(logits,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32),name='accuracy')

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
              train_feed_dict={dropout_keep_prob:0.5, 'phase:0': True},
              test_feed_dict={dropout_keep_prob:1.0})
