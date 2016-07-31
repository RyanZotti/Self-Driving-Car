import tensorflow as tf
import numpy as np
import random

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

input_file_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_data_3_channels.npz'
#input_file_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_half_gamma_data.npz'
npzfile = np.load(input_file_path)

# training data
train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']

# validation/test data
validation_predictors = npzfile['validation_predictors']
validation_targets = npzfile['validation_targets']

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

W_conv1 = weight_variable([3, 3, 3, 16])
b_conv1 = bias_variable([16])
h_conv1 = tf.nn.relu(conv2d(x, W_conv1) + b_conv1)
#h_pool1 = max_pool_2x2(h_conv1)

W_conv2 = weight_variable([3, 3, 16, 16])
b_conv2 = bias_variable([16])
#h_conv2 = tf.nn.relu(conv2d(h_pool1, W_conv2) + b_conv2)
#h_pool2 = max_pool_2x2(h_conv2)
h_conv2 = tf.nn.relu(conv2d(h_conv1, W_conv2) + b_conv2)

W_conv3 = weight_variable([3, 3, 16, 16])
b_conv3 = bias_variable([16])
#h_conv3 = tf.nn.relu(conv2d(h_pool2, W_conv3) + b_conv3)
#h_pool3 = max_pool_2x2(h_conv3)
h_conv3 = tf.nn.relu(conv2d(h_conv2, W_conv3) + b_conv3)

W_conv4 = weight_variable([3, 3, 16, 16])
b_conv4 = bias_variable([16])
#h_conv3 = tf.nn.relu(conv2d(h_pool2, W_conv3) + b_conv3)
#h_pool3 = max_pool_2x2(h_conv3)
h_conv4 = tf.nn.relu(conv2d(h_conv3, W_conv4) + b_conv4)

W_conv5 = weight_variable([3, 3, 16, 16])
b_conv5 = bias_variable([16])
#h_conv3 = tf.nn.relu(conv2d(h_pool2, W_conv3) + b_conv3)
#h_pool3 = max_pool_2x2(h_conv3)
h_conv5 = tf.nn.relu(conv2d(h_conv4, W_conv5) + b_conv5)

W_conv6 = weight_variable([3, 3, 16, 16])
b_conv6 = bias_variable([16])
#h_conv3 = tf.nn.relu(conv2d(h_pool2, W_conv3) + b_conv3)
#h_pool3 = max_pool_2x2(h_conv3)
h_conv6 = tf.nn.relu(conv2d(h_conv5, W_conv6) + b_conv6)

W_fc1 = weight_variable([240 * 320 * 16, 256])
b_fc1 = bias_variable([256])

h_pool4_flat = tf.reshape(h_conv6, [-1, 240 * 320 * 16])
h_fc1 = tf.nn.relu(tf.matmul(h_pool4_flat, W_fc1) + b_fc1)

keep_prob = tf.placeholder(tf.float32)
h_fc1_drop = tf.nn.dropout(h_fc1, keep_prob)

W_fc2 = weight_variable([256, 3])
b_fc2 = bias_variable([3])

y_conv=tf.nn.softmax(tf.matmul(h_fc1_drop, W_fc2) + b_fc2)

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y_conv), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(y_conv,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

# To view graph: tensorboard --logdir=/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/1/
tf.scalar_summary('accuracy', accuracy)
merged = tf.merge_all_summaries()
tfboard_dir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/4/'
train_writer = tf.train.SummaryWriter(tfboard_dir+"/train/",sess.graph)
validation_writer = tf.train.SummaryWriter(tfboard_dir+"/validation/",sess.graph)


sess.run(tf.initialize_all_variables())
batch_index = 0
batches_per_epoch = (train_predictors.shape[0] - train_predictors.shape[0] % 50)/50
for i in range(1000):

    # Shuffle in the very beginning and after each epoch
    if batch_index % batches_per_epoch == 0:
        train_predictors, train_targets = shuffle_dataset(train_predictors, train_targets)
        batch_index = 0
    batch_index += 1

    data_index = batch_index * 50
    predictors = train_predictors[data_index:data_index+50]
    target = train_targets[data_index:data_index+50]

    random_idx = random.randint(0, validation_predictors.shape[0] - 50)
    v_predictors, v_target = validation_predictors[random_idx:random_idx+50], validation_targets[random_idx:random_idx+50]
    if i%100 == 0:

        # Not sure what these two lines do
        run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
        run_opts_metadata = tf.RunMetadata()

        train_summary, train_accuracy = sess.run([merged, accuracy],
                              feed_dict={x: predictors, y_: target, keep_prob: 1.0},
                              options=run_opts,
                              run_metadata=run_opts_metadata)
        train_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        train_writer.add_summary(train_summary, i)

        validation_summary, validation_accuracy = sess.run([merged, accuracy],
                                                 feed_dict={x: v_predictors, y_: v_target, keep_prob: 1.0},
                                                 options=run_opts,
                                                 run_metadata=run_opts_metadata)
        validation_writer.add_run_metadata(run_opts_metadata, 'step%03d' % i)
        validation_writer.add_summary(validation_summary, i)

        print("{i} training accuracy: {train_acc}, validation accuracy: {validation_acc}".format(train_acc=train_accuracy,validation_acc=validation_accuracy,i=i))

    train_step.run(feed_dict={x: predictors, y_: target, keep_prob: 0.5})

# Save the trained model to a file
saver = tf.train.Saver()
save_path = saver.save(sess, "/Users/ryanzotti/Documents/repos/Self-Driving-Car/trained_model/model.ckpt")
#print("validation accuracy %g" % accuracy.eval(feed_dict={x: validation_predictors, y_: validation_targets, keep_prob: 1.0}))
