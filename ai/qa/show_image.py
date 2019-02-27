import argparse
import cv2
from ai.transformations import crop_images, resize_images

ap = argparse.ArgumentParser()
ap.add_argument(
    "--image_path",
    required=False,
    help="Path to image you want to show",
    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_9_18-07-07/149_cam-image_array_.png')

ap.add_argument(
    "--image_scale",
    required=False,
    help="Factor to scale image",
    default=1.0)

args = vars(ap.parse_args())
image_path = args['image_path']
image_scale = args['image_scale']

# Read image from disk
frame = cv2.imread(image_path)

# Show the image
cv2.imshow('frame', frame)

#crop_factor = 2
#cropped_img = frame[int(frame.shape[0]) - int(frame.shape[0]/crop_factor):int(frame.shape[0])]
#print(cropped_img.shape)
#cv2.imshow('bottom x', cropped_img)
#
#cropped_images = resize_images(crop_images(images=[frame],crop_factor=crop_factor),0.125)
#cv2.imshow('bottom x v2', cropped_images[0])
#
## Show resized image if requested
#if image_scale != 1:
#    resized_image = cv2.resize(
#        frame, None,
#        fx=image_scale,
#        fy=image_scale,
#        interpolation=cv2.INTER_CUBIC)
#    cv2.imshow('Resized Image', resized_image)

cv2.waitKey(0)
cv2.destroyAllWindows()

