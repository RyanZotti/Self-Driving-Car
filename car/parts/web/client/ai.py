import cv2
from datetime import datetime
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


class AI(object):
    # TODO: Read host from config file
    def __init__(self, model_api,name):

        super().__init__()
        self.on = True
        self.model_api = model_api
        self.last_update_time = None
        self.name = name
        self.healthcheck = 'fail'

    def update(self):
        self.predicted_angle = 0.0
        self.predicted_throttle = 0.0
        while self.on:
            try:
                img = cv2.imencode('.jpg', self.img_arr)[1].tostring()
                files = {'image': img}
                request = requests.post(self.model_api, files=files)
                response = json.loads(request.text)
                prediction = response['prediction']
                self.predicted_angle, self.predicted_throttle = prediction
                self.last_update_time = datetime.now()
                self.healthcheck = 'pass'
            except:
                # Always attempt to get predictions. If no model
                # exists or a model exists but is not reachable
                # due to a bug then the result should be the
                # same: 0.0, 0.0
                self.predicted_angle = 0.0
                self.predicted_throttle = 0.0
                self.healthcheck = 'fail'

    def run_threaded(self, img_arr=None):
        self.img_arr = img_arr
        return self.predicted_angle, self.predicted_throttle, self.healthcheck

    def get_last_update_time(self):
        return self.last_update_time

    def shutdown(self):
        # indicate that the thread should be stopped
        self.on = False
        print('Stopped {name}'.format(name=self.name))
