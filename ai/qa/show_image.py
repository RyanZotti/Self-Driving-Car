import argparse
import cv2


ap = argparse.ArgumentParser()
ap.add_argument(
    "--image_path",
    required=False,
    help="Path to image you want to show",
    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_1_18-04-15/3207_cam-image_array_.jpg')

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

# Show resized image if requested
if image_scale != 1:
    resized_image = cv2.resize(
        frame, None,
        fx=image_scale,
        fy=image_scale,
        interpolation=cv2.INTER_CUBIC)
    cv2.imshow('Resized Image', resized_image)

cv2.waitKey(0)
cv2.destroyAllWindows()

