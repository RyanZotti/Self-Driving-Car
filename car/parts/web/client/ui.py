import cv2
from datetime import datetime
import os
import time
import numpy as np
import glob
import subprocess
import urllib.request


import requests
import json


class Client(object):

    def __init__(self, api,name,server_path,port):

        super().__init__()
        self.on = True
        self.api = api
        self.server_path = server_path
        self.port = port
        self.last_update_time = None
        self.name = name
        self.on = True

        # Set default values
        self.angle = 0.0
        self.throttle = 0.0
        self.drive_mode = 'user'
        self.recording = False

        # Run ffmpeg as a subprocess
        cmd = 'python3 {server} --port {port}'.format(
            server=self.server_path,
            port=self.port)
        self.process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)

    def update(self):

        while self.on:
            try:
                response = requests.get('{api}'.format(state_api=self.api))
                state = json.loads(response.text)
                self.angle = state['angle']
                self.throttle = state['throttle']
                self.drive_mode = state['drive_mode']
                self.recording = state['recording']
                self.last_update_time = datetime.now()
            except:
                # Always attempt to get the state. If the state
                # is not available, reset to defaults and
                # effectively stop the car until the state can
                # be recovered
                self.angle = 0.0
                self.throttle = 0.0
                self.drive_mode = 'user'
                self.recording = False

    def run_threaded(self):
        return self.angle, self.throttle, self.drive_mode, self.recording

    def get_last_update_time(self):
        return self.last_update_time

    def shutdown(self):
        # Indicate that the thread should be stopped
        self.on = False
        if self.process is not None:
            self.process.kill()
        print('Stopped {name}'.format(name=self.name))
