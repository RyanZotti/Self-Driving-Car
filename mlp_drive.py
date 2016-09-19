import tensorflow as tf
import urllib.request
import requests
import numpy as np
from datetime import datetime
import cv2
import json
import os
from haar_cascades.haar_cascade_webcam import detect_stop_sign

sess = tf.InteractiveSession(config=tf.ConfigProto())

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

image_path = str(os.path.dirname(os.path.realpath(__file__))) + "/arrow_key_images"
up_arrow = cv2.imread(image_path + '/UpArrow.tif')
left_arrow = cv2.imread(image_path + '/LeftArrow.tif')
right_arrow = cv2.imread(image_path + '/Right Arrow.tif')

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
        normalized_frame = frame / 255
        new_frame = np.array([normalized_frame])
        prediction = tf.argmax(y, 1)
        command_map = {0:"left",1:"up",2:"right"}
        command_index = prediction.eval(feed_dict={x: new_frame}, session=sess)[0]
        command = command_map[command_index]
        key_image = None
        if command == 'left':
            key_image = left_arrow
        elif command == 'up':
            key_image = up_arrow
        elif command == 'right':
            key_image = right_arrow

        distance_api = requests.get('http://192.168.0.35:81/distance')
        try:
            obstacle_distance = float(distance_api.text)
        except:
            obstacle_distance = 99999.99

        if frame is not None:

            arrow_key_scale = 0.125
            resized_image = cv2.resize(key_image, None, fx=arrow_key_scale, fy=arrow_key_scale,interpolation=cv2.INTER_CUBIC)
            cv2.imshow("prediction", new_frame[0])
            # Thresholding requires grayscale only, so that threshold only needs to happen in one dimension
            img2gray = cv2.cvtColor(resized_image, cv2.COLOR_BGR2GRAY)

            # Create mask where anything greater than 240 bright is made super white (255) / selected
            ret, mask = cv2.threshold(img2gray, 240, 255, cv2.THRESH_BINARY)

            # TODO: understand how this copy-pasted OpenCV masking code works
            mask_inv = cv2.bitwise_not(mask)  # invert the mask
            rows, cols, channels = resized_image.shape  # get size of image
            region_of_interest = frame[0:rows, 0:cols]
            img1_bg = cv2.bitwise_and(region_of_interest, region_of_interest, mask=mask)  # ???
            img2_fg = cv2.bitwise_and(resized_image, resized_image, mask=mask_inv)  # ???
            dst = cv2.add(img1_bg, img2_fg)  # ???
            frame[0:rows, 0:cols] = dst

            # Finally, show image with the an overlay of identified target key image
            frame = detect_stop_sign(frame)
            cv2.imshow('frame', frame)

        now = datetime.now()
        post_map = {"left": 37, "up": 38, "right": 39}
        post_command = post_map[command]
        if obstacle_distance > 10.00:
            data = {'command':{str(post_command):command}}
            r = requests.post('http://192.168.0.35:81/post', data=json.dumps(data))
            print(command + " " + str(now)+" status code: "+str(r.status_code))
        else:
            command = "STOP! Obstacle detected."
        print(command + " " + str(now)+" distance: "+str(obstacle_distance))
        if cv2.waitKey(1) == 27:
            exit(0)

print("Finished")