import cv2
import os
import time
import numpy as np
from PIL import Image
import glob
import subprocess
from util import live_video_stream
import urllib.request


class BaseCamera:
    def run_threaded(self):
        return self.frame


class Webcam(BaseCamera):

    # TODO: Read host from config file
    def __init__(self,ffmpeg_host):

        super().__init__()

        cmd = 'cd /usr/src/ffmpeg & sudo ffserver -f /etc/ff.conf_original & ffmpeg -v quiet -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost/webcam.ffm'
        subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)

        # TODO: Read host from config file
        self.ffmpeg_host = ffmpeg_host

        stream_url = 'http://{ffmpeg_host}/webcam.mjpeg'.format(ffmpeg_host=ffmpeg_host)
        self.stream = urllib.request.urlopen(stream_url)
        self.opencv_bytes = bytes()

        # initialize variable used to indicate
        # if the thread should be stopped
        self.frame = None
        self.on = True

        print('WebcamVideoStream loaded.. .warming camera')

    def update(self):
        while self.on:

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

    def run_threaded(self):
        return self.frame

    def shutdown(self):
        # indicate that the thread should be stopped
        self.on = False
        print('stoping Webcam')
        time.sleep(.5)