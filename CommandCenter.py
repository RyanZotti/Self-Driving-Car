import tensorflow as tf
import requests
from datetime import datetime
import cv2
import json
from util import *
import queue
import threading
import time
from  data_augmentation import apply_transformations


class CommandCenter:

    def __init__(self,
                 checkpoint_dir_path,
                 ip=None):

        self.ip = ip  # Car's IP address. Used to receive video and send commands

        # Read command images
        image_path = str(os.path.dirname(os.path.realpath(__file__))) + "/arrow_key_images"
        self.up_arrow = cv2.imread(image_path + '/UpArrow.tif')
        self.left_arrow = cv2.imread(image_path + '/LeftArrow.tif')
        self.right_arrow = cv2.imread(image_path + '/Right Arrow.tif')

        # Read the model into memory
        start_epoch = get_prev_epoch(checkpoint_dir_path)
        graph_name = 'model-' + str(start_epoch)
        checkpoint_file_path = os.path.join(checkpoint_dir_path, graph_name)
        saver = tf.train.import_meta_graph(checkpoint_dir_path + "/" + graph_name + ".meta")
        self.sess = tf.Session()
        saver.restore(self.sess, checkpoint_file_path)
        graph = tf.get_default_graph()
        self.x = graph.get_tensor_by_name("x:0")
        # For more details on why .outputs[0] is required, see:
        # https://stackoverflow.com/questions/42595543/tensorflow-eval-restored-graph
        make_logits = graph.get_operation_by_name("logits")
        logits = make_logits.outputs[0]

        # A tensor representing the model's prediction
        self.prediction = tf.argmax(logits, 1)  # tf.argmax returns the index with the largest value across axes of a tensor

        # Multi-threaded prediction queue to prevent blocking of incoming frames
        self.frame_queue = queue.LifoQueue()
        self.prediction_queue = queue.LifoQueue()
        self.prediction_visualization_queue = queue.Queue()
        prediction_thread = threading.Thread(name="Prediction thread",
                             target=self.predict_from_queue,
                             args=())
        prediction_thread.start()
        remote_command_thread = threading.Thread(name="Remote command thread",
                                             target=self.send_remote_command,
                                             args=())
        remote_command_thread.start()

    def put(self,frame):
        self.frame_queue.put(frame)

    def prediction_visualization_qsize(self):
        return self.prediction_visualization_queue.qsize()

    def get_command(self,frame):
        command = self.prediction_visualization_queue.get()
        print(command)
        frame = overlay_command_on_image(frame=frame,
                                         command=command,
                                         left_arrow=self.left_arrow,
                                         up_arrow=self.up_arrow,
                                         right_arrow=self.right_arrow)
        self.prediction_visualization_queue.task_done()
        return command, frame

    # Sends a command to the car over http
    def send_remote_command(self):
        while True:
            command = self.prediction_queue.get()
            post_map = {"left": 37, "up": 38, "right": 39}
            post_command = post_map[command]
            data = {'command': {str(post_command): command}}
            r = requests.post('http://{ip}:81/post'.format(ip=self.ip), data=json.dumps(data))
            now = datetime.now()
            print(command + " " + str(now) + " status code: " + str(r.status_code))
            # Add a stop command so that the car doesn't freeze on the previous command
            delay = 0.15
            time.sleep(delay)
            data = {'command': {str(99): 'stop'}}
            r = requests.post('http://{ip}:81/post'.format(ip=self.ip), data=json.dumps(data))
            self.prediction_queue.task_done()

    # Reads centimeter distance from the forward-facing ultrasound sensor
    def read_sensor_distance(self):
        distance_api = requests.get('http://{ip}:81/distance'.format(ip=self.ip))
        distance = 99999.99
        try:
            distance = float(distance_api.text)
        except:
            pass
        return distance

    # Threadable prediction function
    def predict_from_queue(self):
        # Infinite loop required to keep thread alive, otherwise it consumes first queue item only
        while True:
            frame = self.frame_queue.get()
            # TODO: Fix this bug. Right now if I don't pass mirror image, model outputs unchanging prediction
            flipped_image = cv2.flip(frame, 1)
            normalized_images = [frame, flipped_image]
            normalized_images = np.array(normalized_images)
            # Normalize for contrast and pixel size
            normalized_images = apply_transformations(normalized_images)
            command_map = {0: "left", 1: "up", 2: "right"}
            command_index = self.prediction.eval(feed_dict={self.x: normalized_images}, session=self.sess)[0]
            command = command_map[command_index]
            self.prediction_queue.put(command)
            self.prediction_visualization_queue.put(command)
            self.frame_queue.task_done()