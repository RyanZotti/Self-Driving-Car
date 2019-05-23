from datetime import datetime
import subprocess
import requests
import json


class UI(object):

    def __init__(self, api,name,server_path,port):

        super().__init__()
        self.on = True
        self.server_path = server_path
        self.port = port
        self.api = api.format(port=self.port)
        self.last_update_time = None
        self.name = name
        self.on = True

        # Set default values
        self.user_angle = 0.0
        self.user_throttle = 0.0
        self.remote_model_angle = 0.0
        self.remote_model_throttle = 0.0
        self.drive_mode = 'user'
        self.recording = False
        self.brake = True
        self.max_throttle = 1.0

        # TODO: Make this a separate Docker container?
        cmd = 'python3 {server} --port {port}'.format(
            server=self.server_path,
            port=self.port)
        self.process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)

    def update(self):

        while self.on:
            try:
                response = requests.get('{api}'.format(api=self.api))
                state = json.loads(response.text)
                self.user_angle = state['user_angle']
                self.user_throttle = state['user_throttle']
                self.remote_model_angle = state['remote_model_angle']
                self.remote_model_throttle = state['remote_model_throttle']
                self.drive_mode = state['drive_mode']
                self.recording = state['recording']
                self.brake = state['brake']
                self.max_throttle = state['max_throttle']
                self.last_update_time = datetime.now()
            except:
                # Always attempt to get the state. If the state
                # is not available, reset to defaults and
                # effectively stop the car until the state can
                # be recovered
                self.user_angle = 0.0
                self.user_throttle = 0.0
                self.remote_model_angle = 0.0
                self.remote_model_throttle = 0.0
                self.drive_mode = 'user'
                self.recording = False
                self.brake = True
                self.max_throttle = 1.0

    def run_threaded(self):
        return self.remote_model_angle, \
               self.remote_model_throttle, \
               self.user_angle, \
               self.user_throttle, \
               self.drive_mode, \
               self.recording, \
               self.brake, \
               self.max_throttle

    def get_last_update_time(self):
        return self.last_update_time

    def shutdown(self):
        # Indicate that the thread should be stopped
        self.on = False
        if self.process is not None:
            self.process.kill()
        print('Stopped {name}'.format(name=self.name))
