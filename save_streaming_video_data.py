import argparse
import cv2
import urllib.request
import numpy as np
from datetime import datetime
import os


# Example: python save_streaming_video_data.py --ip 192.168.1.82
ap = argparse.ArgumentParser()
ap.add_argument("--host", required=True, help="Raspberry Pi hostname or IP")
args = vars(ap.parse_args())
host = args["host"]

# First log into the raspberry pi, and then do these two things:
# cd /usr/src/ffmpeg
# sudo ffserver -f /etc/ff.conf_original & ffmpeg -v quiet -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost/webcam.ffm

fourcc = cv2.VideoWriter_fourcc(*'jpeg')
out = cv2.VideoWriter('output.mov',fourcc, 20.0, (320,240))
file_path = str(os.path.dirname(os.path.realpath(__file__)))+"/video_timestamps.txt"
stream = urllib.request.urlopen('http://{host}/webcam.mjpeg'.format(host=host))

bytes = bytes()
while True:
    bytes += stream.read(1024)
    a = bytes.find(b'\xff\xd8')
    b = bytes.find(b'\xff\xd9')
    if a != -1 and b != -1:
        jpg = bytes[a:b+2]
        bytes = bytes[b+2:]
        frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
        #cv2.imshow('Car Camera', frame)
        now = datetime.now()
        print(now)
        if frame is not None:   
          cv2.imshow("car camera", frame)
          
          # Use the code below if I need find the dimensions of the video
          '''
          height, width, channels = frame.shape
          print(height)
          print(width)
          '''
          out.write(frame)
          timestamp = datetime.now()
          with open(file_path,"a") as writer:
            writer.write(str(timestamp)+"\n")

        if cv2.waitKey(1) == 27:
            exit(0)