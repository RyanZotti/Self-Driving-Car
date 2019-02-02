import tensorflow as tf
from Trainer import Trainer, parse_args
import os
from model import *


args = parse_args()
data_path = args["datapath"]
epochs = args["epochs"]
s3_bucket = args['s3_bucket']
show_speed = args['show_speed']
show_speed = False
s3_sync = args['s3_sync']
s3_sync = False
save_to_disk = args['save_to_disk']
save_to_disk = True
image_scale = 0.125
crop_factor = 2

sess = tf.InteractiveSession(config=tf.ConfigProto())

x = tf.placeholder(tf.float32, shape=[None, 15, 40, 3], name='x')
y_ = tf.placeholder(tf.float32, shape=[None, 2], name='y_')
phase = tf.placeholder(tf.bool, name='phase')

conv1 = batch_norm_conv_layer('layer1', x, [3, 3, 3, 32], phase)
conv2 = batch_norm_conv_layer('layer2',conv1, [3, 3, 32, 32], phase)

h_pool4_flat = tf.reshape(conv2, [-1, 15 * 40 * 32])
h5 = batch_norm_fc_layer('layer5',h_pool4_flat, [15 * 40 * 32, 64], phase)

W_final = weight_variable('layer8',[64, 2])
b_final = bias_variable('layer8',[2])
pre_clipped_logits = tf.add(tf.matmul(h5, W_final), b_final, name='pre_clipped_logits')


# Forces predictions to fall within acceptable ranges to
# avoid exploding rmse loss values that penalize max angle
angle, throttle = tf.split(pre_clipped_logits, 2, axis=1)
clipped_angle = tf.clip_by_value(
    t=angle,
    clip_value_min=-1,
    clip_value_max=1)

# My car only starts to move at >0.25
clipped_throttle = tf.clip_by_value(
    t=throttle,
    clip_value_min=0.25,
    clip_value_max=1)

# Bring the two columns back together
logits = tf.concat([clipped_angle, clipped_throttle], axis=1, name='logits')

# TODO: Fix this x.shape[0] bug
rmse = tf.sqrt(tf.reduce_mean(tf.squared_difference(logits, y_)),name='loss')

train_step = tf.train.AdamOptimizer(1e-4,name='train_step').minimize(rmse)

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
    train_step = tf.train.AdamOptimizer(1e-5).minimize(rmse)

model_file = os.path.dirname(os.path.realpath(__file__)) + '/' + os.path.basename(__file__)
trainer = Trainer(data_path=data_path,
                  model_file=model_file,
                  s3_bucket=s3_bucket,
                  epochs=epochs,
                  max_sample_records=100,
                  show_speed=show_speed,
                  s3_sync=s3_sync,
                  save_to_disk=save_to_disk,
                  image_scale=image_scale,
                  crop_factor=crop_factor)
trainer.train(sess=sess, x=x, y_=y_,
              optimization=rmse,
              train_step=train_step,
              train_feed_dict={'phase:0': True},
              test_feed_dict={})
