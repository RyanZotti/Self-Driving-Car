import numpy as np
import cv2
import argparse

# example: python read_camera_file.py -f /Users/ryanzotti/Documents/repos/OpenCV_examples/output.mov

ap = argparse.ArgumentParser()
ap.add_argument("-f", "--file", required = True,
    help = "path to where the face cascade resides")
args = vars(ap.parse_args())
mov_file = args["file"]

cap = cv2.VideoCapture(mov_file)

while(cap.isOpened()):
    ret, frame = cap.read()

    cv2.imshow('frame',frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()