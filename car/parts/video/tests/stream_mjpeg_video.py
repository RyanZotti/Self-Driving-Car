import cv2
import argparse
from ai.utilities import *


"""
# example
export REPO=/Users/ryanzotti/Documents/repos/Self-Driving-Car
export PYTHONPATH=$PYTHONPATH:${REPO}
python ${REPO}/car/parts/video/tests/stream_mjpeg_video.py --ip_address ryanzotti.local --port 8091
"""
ap = argparse.ArgumentParser()
ap.add_argument("-i", "--ip_address", required=True, help="Raspberry Pi ip address")
ap.add_argument("--port", required=True, help="ffmpeg port")
args = vars(ap.parse_args())
ip = args['ip_address']
port = args['port']

for frame in live_video_stream(ip=ip,port=port,no_change_count_threshold=150):
    cv2.imshow('frame', frame)