import cv2
import os
import time
import numpy as np
from PIL import Image
import glob
import subprocess
from util import live_video_stream
import urllib.request


import cv2
import requests
import json
from pprint import pprint


class PredictionCaller(object):
    # TODO: Read host from config file
    def __init__(self):

        super().__init__()


        # initialize variable used to indicate
        # if the thread should be stopped
        self.on = True

        print('Turning on prediction caller...')

    def update(self):
        while self.on:
            pass  # If this fails then I should just call run_threaded() here

    def run_threaded(self, img_arr=None):

        img = cv2.imencode('.jpg', img_arr)[1].tostring()
        url = 'http://localhost:8888/predict'
        files = {'image': img}
        request = requests.post(url, files=files)
        response = json.loads(request.text)
        prediction = response['prediction']
        self.predicted_angle, self.predicted_throttle = prediction
        return self.predicted_angle, self.predicted_throttle

    def shutdown(self):
        # indicate that the thread should be stopped
        self.on = False
        print('Stopping prediction caller')
        time.sleep(.5)