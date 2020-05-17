import tensorflow as tf


def weight_variable(scope,shape):
    with tf.variable_scope(scope):
        W = tf.get_variable('W',shape,initializer=tf.contrib.layers.xavier_initializer())
        return W


def bias_variable(scope,shape):
    with tf.variable_scope(scope):
        b = tf.get_variable('b', shape, initializer=tf.constant_initializer(0.1))
        return b


def conv2d(x, W):
    return tf.nn.conv2d(x, W, strides=[1, 1, 1, 1], padding='SAME')


def max_pool_2x2(x):
    return tf.nn.max_pool(x, ksize=[1, 2, 2, 1],
                          strides=[1, 2, 2, 1], padding='SAME')


def batch_norm_conv_layer(scope,input, weight_shape, phase):
    with tf.variable_scope(scope):
        W_conv = weight_variable(scope,weight_shape)
        b_conv = bias_variable(scope,[weight_shape[-1]])
        h_conv = conv2d(input, W_conv) + b_conv
        is_training = True if phase is not None else False
        h2 = tf.contrib.layers.batch_norm(h_conv,
                                          center=True, scale=True,
                                          is_training=is_training)
    return h2


# TODO: consolidate this somehow into batch_norm_conv_layer
def batch_norm_pool_conv_layer(scope,input, weight_shape, phase):
    with tf.variable_scope(scope):
        W_conv = weight_variable(scope,weight_shape)
        b_conv = bias_variable(scope,[weight_shape[-1]])
        h_conv = conv2d(input, W_conv) + b_conv
        max_pool = max_pool_2x2(tf.nn.relu(h_conv))
        is_training = True if phase is not None else False
        h2 = tf.contrib.layers.batch_norm(max_pool,
                                          center=True, scale=True,
                                          is_training=is_training)
    return h2


def batch_norm_fc_layer(scope,input, weight_shape, phase):
    with tf.variable_scope(scope):
        W = weight_variable(scope,weight_shape)
        b = bias_variable(scope,[weight_shape[-1]])
        h = tf.nn.relu(tf.matmul(input, W) + b)
        is_training = True if phase is not None else False
        h2 = tf.contrib.layers.batch_norm(h,
                                          center=True, scale=True,
                                          is_training=is_training)
    return h2