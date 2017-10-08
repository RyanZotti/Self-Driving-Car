import argparse
import tensorflow as tf
import urllib.request
import requests
from datetime import datetime
import cv2
import json
from util import *
from haar_cascades.haar_cascade_webcam import detect_stop_sign

sess = tf.InteractiveSession(config=tf.ConfigProto())

ap = argparse.ArgumentParser()
ap.add_argument("-i", "--ip_address", required=True, help="Raspberry Pi ip address")
ap.add_argument("-c", "--model_dir", required=True, help="Path to model checkpoint directory")
args = vars(ap.parse_args())

checkpoint_dir_path = args['model_dir']
ip = args['ip_address']

start_epoch = get_prev_epoch(checkpoint_dir_path)
graph_name = 'model-'+str(start_epoch)
checkpoint_file_path = os.path.join(checkpoint_dir_path,graph_name)
saver = tf.train.import_meta_graph(checkpoint_dir_path+"/"+graph_name+".meta")
sess = tf.Session()

# Read the model into memory
saver.restore(sess, checkpoint_file_path)
graph = tf.get_default_graph()

for n in tf.get_default_graph().as_graph_def().node:
    print(n.name)

# Restore values from previous run. These values should be same for all models
accuracy = graph.get_tensor_by_name("accuracy:0")
x = graph.get_tensor_by_name("x:0")
y_ = graph.get_tensor_by_name("y_:0")
train_step = graph.get_operation_by_name('train_step')

# Restore the Tensorflow op that creates the logits
make_logits = graph.get_operation_by_name("logits")

# Create a tensor from the restored `logits` op
# For more details on why .outputs[0] is required, see: https://stackoverflow.com/questions/42595543/tensorflow-eval-restored-graph
logits = make_logits.outputs[0]

# A tensor representing the model's prediction
prediction = tf.argmax(logits, 1)  # tf.argmax returns the index with the largest value across axes of a tensor

train_feed_dict = {}
test_feed_dict = {}

image_path = str(os.path.dirname(os.path.realpath(__file__))) + "/arrow_key_images"
up_arrow = cv2.imread(image_path + '/UpArrow.tif')
left_arrow = cv2.imread(image_path + '/LeftArrow.tif')
right_arrow = cv2.imread(image_path + '/Right Arrow.tif')

fourcc = cv2.VideoWriter_fourcc(*'jpeg')
out = cv2.VideoWriter('output.mov', fourcc, 20.0, (320, 240))
stream = urllib.request.urlopen('http://{ip}/webcam.mjpeg'.format(ip=ip))
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

        distance_api = requests.get('http://{ip}:81/distance'.format(ip=ip))
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
            r = requests.post('http://{ip}:81/post'.format(ip=ip), data=json.dumps(data))
            print(command + " " + str(now)+" status code: "+str(r.status_code))
        else:
            command = "STOP! Obstacle detected."
        print(command + " " + str(now)+" distance: "+str(obstacle_distance))
        if cv2.waitKey(1) == 27:
            exit(0)

print("Finished")