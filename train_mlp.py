import tensorflow as tf
import numpy as np
import argparse
from util import mkdir_tfboard_run_dir,mkdir,shell_command, shuffle_dataset
import os

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

# python train_mlp.py -d /root/data -b 1000
ap = argparse.ArgumentParser()
ap.add_argument("-d", "--datapath", required = False,
    help = "path to all of the data",
    default='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car')
ap.add_argument("-b", "--batches", required = False,
    help = "quantity of batch iterations to run",
    default='10000')
args = vars(ap.parse_args())
data_path = args["datapath"]
batch_iterations = int(args["batches"])

input_file_path = data_path+'/final_processed_data_3_channels.npz'
tfboard_basedir = mkdir(data_path+'/tf_visual_data/runs/')
tfboard_run_dir = mkdir_tfboard_run_dir(tfboard_basedir)
model_checkpoint_path = mkdir(tfboard_run_dir+'/trained_model')

npzfile = np.load(input_file_path)

# training data
train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']

# validation/test data
validation_predictors = npzfile['validation_predictors']
validation_targets = npzfile['validation_targets']
validation_predictors, validation_targets = shuffle_dataset(validation_predictors, validation_targets)

sess = tf.InteractiveSession(config=tf.ConfigProto())

def shuffle_dataset(predictors, targets):
    record_count = predictors.shape[0]
    shuffle_index = np.arange(record_count)
    np.random.shuffle(shuffle_index)
    predictors = predictors[shuffle_index]
    targets = targets[shuffle_index]
    return predictors, targets

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

x_shaped = tf.reshape(x, [-1, 240 * 320 * 3])

W1 = weight_variable([240 * 320 * 3, 32])
b1 = bias_variable([32])
h1 = tf.sigmoid(tf.matmul(x_shaped, W1) + b1)

W2 = weight_variable([32, 3])
b2 = bias_variable([3])
y=tf.nn.softmax(tf.matmul(h1, W2) + b2)

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(y,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

# To view graph: tensorboard --logdir=/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs
tf.scalar_summary('accuracy', accuracy)
merged = tf.merge_all_summaries()

tfboard_basedir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/'
tfboard_run_dir = mkdir_tfboard_run_dir(tfboard_basedir)
train_dir = mkdir(tfboard_run_dir+"/trn/mlp/")
validation_dir = mkdir(tfboard_run_dir+"/vld/mlp/")

# Archive this script to document model design in event of good results that need to be replicated
model_file_path = os.path.dirname(os.path.realpath(__file__))+'/'+os.path.basename(__file__)
shell_command('cp {model_file} {archive_path}'.format(model_file=model_file_path,archive_path=tfboard_run_dir+'/'))

train_writer = tf.train.SummaryWriter(train_dir,sess.graph)
validation_writer = tf.train.SummaryWriter(validation_dir,sess.graph)

sess.run(tf.initialize_all_variables())
batch_index = 0
batches_per_epoch = (train_predictors.shape[0] - train_predictors.shape[0] % 50)/50
for i in range(batch_iterations):

    # Shuffle in the very beginning and after each epoch
    if batch_index % batches_per_epoch == 0:
        train_predictors, train_targets = shuffle_dataset(train_predictors, train_targets)
        batch_index = 0
    batch_index += 1

    data_index = batch_index * 50
    predictors = train_predictors[data_index:data_index+50]/255
    target = train_targets[data_index:data_index+50]

    if i%425 == 0:

        # Not sure what these two lines do
        run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
        run_opts_metadata = tf.RunMetadata()

        train_summary, train_accuracy = sess.run([merged, accuracy],
                              feed_dict={x: predictors, y_: target},
                              options=run_opts,
                              run_metadata=run_opts_metadata)
        train_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        train_writer.add_summary(train_summary, i)

        validation_summary, validation_accuracy = sess.run([merged, accuracy],
                                                 feed_dict={x: validation_predictors[:1000]/255, y_: validation_targets[:1000]},
                                                 options=run_opts,
                                                 run_metadata=run_opts_metadata)
        validation_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        validation_writer.add_summary(validation_summary, i)

        print("{i} training accuracy: {train_acc}, validation accuracy: {validation_acc}".format(train_acc=train_accuracy,validation_acc=validation_accuracy,i=i))

    train_step.run(feed_dict={x: predictors, y_: target})

# Save the trained model to a file
saver = tf.train.Saver()
save_path = saver.save(sess, tfboard_run_dir+"/model.ckpt")
#print("validation accuracy %g" % accuracy.eval(feed_dict={x: validation_predictors, y_: validation_targets, keep_prob: 1.0}))

# Marks unambiguous successful completion to prevent deletion by cleanup script
shell_command('touch '+tfboard_run_dir+'/SUCCESS')