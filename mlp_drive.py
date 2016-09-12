import tensorflow as tf
import urllib.request
import requests
import numpy as np
from datetime import datetime
import cv2
import json

sess = tf.InteractiveSession(config=tf.ConfigProto())

def abc():
    pass

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

saver = tf.train.Saver()
saver.restore(sess, "/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/1/trained_model/model.ckpt")

cross_entropy = tf.reduce_mean(-tf.reduce_sum(y_ * tf.log(y), reduction_indices=[1]))
train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)
correct_prediction = tf.equal(tf.argmax(y,1), tf.argmax(y_,1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, tf.float32))

sess.run(tf.initialize_all_variables())

fourcc = cv2.VideoWriter_fourcc(*'jpeg')
out = cv2.VideoWriter('output.mov', fourcc, 20.0, (320, 240))
stream = urllib.request.urlopen('http://192.168.0.35/webcam.mjpeg')
bytes = bytes()
while True:
    bytes += stream.read(1024)
    a = bytes.find(b'\xff\xd8')
    b = bytes.find(b'\xff\xd9')
    if a != -1 and b != -1:
        jpg = bytes[a:b + 2]
        bytes = bytes[b + 2:]
        frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
        frame = frame / 255
        new_frame = np.array([frame])
        if frame is not None:
            cv2.imshow("prediction", new_frame[0])
        prediction = tf.argmax(y, 1)
        command_map = {0:"left",1:"up",2:"right"}
        command_index = prediction.eval(feed_dict={x: new_frame}, session=sess)[0]
        command = command_map[command_index]
        now = datetime.now()
        post_map = {"left": 37, "up": 38, "right": 39}
        post_command = post_map[command]
        #r = requests.post('http://192.168.0.35:81/post', data={'command': {post_command:True}})
        data = {'command':{str(post_command):command}}
        r = requests.post('http://192.168.0.35:81/post', data=json.dumps(data))
        print(command + " " + str(now)+" status code: "+str(r.status_code))
        if cv2.waitKey(1) == 27:
            exit(0)

print("Finished")