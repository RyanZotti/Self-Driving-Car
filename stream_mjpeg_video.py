import cv2
import argparse
from util import *


# This is a script that is helpful for debugging. You can stream video from the Pi without saving it
# First log into the raspberry pi, and then do these two things:
# cd /usr/src/ffmpeg
# sudo ffserver -f /etc/ff.conf_original & ffmpeg -v quiet -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost/webcam.ffm

ap = argparse.ArgumentParser()
ap.add_argument("-i", "--ip_address", required=True, help="Raspberry Pi ip address")
args = vars(ap.parse_args())
ip = args['ip_address']

for frame in live_video_stream(ip):
    cv2.imshow('frame', frame)