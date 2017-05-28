import tensorflow as tf
from Trainer import Trainer, parse_args

# python train_mlp.py --datapath /root/data --epochs 50
data_path, epochs = parse_args()

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

W1 = weight_variable([240 * 320 * 3, 32])
b1 = bias_variable([32])
h1 = tf.tanh(tf.matmul(x_shaped, W1) + b1)

W2 = weight_variable([32, 32])
b2 = bias_variable([32])
h2 = tf.tanh(tf.matmul(h1, W2) + b2)

W3 = weight_variable([32, 3])
b3 = bias_variable([3])
y=tf.nn.softmax(tf.matmul(h2, W3) + b3)

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-5).minimize(cross_entropy)
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