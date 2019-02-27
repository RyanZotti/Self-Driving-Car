import cv2
from datetime import datetime
import os
import time
import numpy as np
from PIL import Image
import glob
import subprocess
import urllib.request
from car.utils import *


class Webcam(object):

    # TODO: Read host from config file
    def __init__(self, pi_host, name, unit_test=False):

        self.pi_host = pi_host
        self.ffmpeg_process = None  # Fixes "has no attribute" error
        self.name = name
        self.last_update_time = None

        # Serve static images during unit tests, since I
        # likely won't have access to the car and ffmpeg
        self.unit_test = unit_test

        # initialize variable used to indicate
        # if the thread should be stopped
        self.frame = None
        self.on = True

        if not self.unit_test:
            stream_url = 'http://{pi_host}:8090/test.mjpg'.format(pi_host=self.pi_host)
            self.stream = urllib.request.urlopen(stream_url)
            self.opencv_bytes = bytes()

            # Getting rid of this sleep causes the whole car to
            # fail the very first time the Pi is turned on
            print('Allowing time for camera to turn on...')
            time.sleep(2)

        else:
            # TODO: Save a permanent image to the repo and replace this user-specific path
            image_path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_1_18-04-15/3207_cam-image_array_.jpg'
            self.frame = cv2.imread(image_path)

    def update(self):
        while self.on:
            if not self.unit_test:
                self.opencv_bytes += self.stream.read(1024)
                a = self.opencv_bytes.find(b'\xff\xd8')
                b = self.opencv_bytes.find(b'\xff\xd9')
                if a != -1 and b != -1:
                    jpg = self.opencv_bytes[a:b + 2]
                    self.opencv_bytes = self.opencv_bytes[b + 2:]
                    frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                    if cv2.waitKey(1) == 27:
                        exit(0)
                    self.frame = frame
            self.last_update_time = datetime.now()

    def get_last_update_time(self):
        return self.last_update_time

    def run_threaded(self):
        return self.frame

    def shutdown(self):
        # indicate that the thread should be stopped
        self.on = False
        if self.ffmpeg_process is not None:
            self.ffmpeg_process.kill()
        print('Stopped camera')