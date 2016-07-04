import numpy as np
import cv2
import argparse
import os

# example: python play_key.py -f /Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/1/output.mov

ap = argparse.ArgumentParser()
ap.add_argument("-f", "--file", required = True,
    help = "path to where the face cascade resides")
args = vars(ap.parse_args())
mov_file = args["file"]

image_path = str(os.path.dirname(os.path.realpath(__file__)))+"/arrow_key_images"
all_arrows = cv2.imread(image_path+'/All Arrows.tif')
up_arrow = cv2.imread(image_path+'/UpArrow.tif')
left_arrow = cv2.imread(image_path+'/LeftArrow.tif')
right_arrow = cv2.imread(image_path+'/Right Arrow.tif')

# The original image is huge, so I need to rescale it
scale = 0.125
resized_image = cv2.resize(left_arrow,None,fx=scale, fy=scale, interpolation = cv2.INTER_CUBIC)

# Thresholding requires grayscale only, so that threshold only needs to happen in one dimension
img2gray = cv2.cvtColor(resized_image,cv2.COLOR_BGR2GRAY)

# Create mask where anything greater than 240 bright is made super white (255) / selected
ret, mask = cv2.threshold(img2gray, 240, 255, cv2.THRESH_BINARY)

mask_inv = cv2.bitwise_not(mask)
rows,cols,channels = resized_image.shape
cap = cv2.VideoCapture(mov_file)

while(cap.isOpened()):
    ret, frame = cap.read()
    roi = frame[0:rows, 0:cols ]
    img1_bg = cv2.bitwise_and(roi,roi,mask = mask)
    img2_fg = cv2.bitwise_and(resized_image,resized_image,mask = mask_inv)
    dst = cv2.add(img1_bg,img2_fg)
    frame[0:rows, 0:cols ] = dst

    cv2.imshow('frame',frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()