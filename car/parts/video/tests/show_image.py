import argparse
import cv2
from ai.transformations import crop_images, resize_images

"""
Example:
    export PYTHONPATH=$PYTHONPATH:/Users/ryanzotti/Documents/repos/Self-Driving-Car
    python /Users/ryanzotti/Documents/repos/Self-Driving-Car/car/parts/video/tests/show_image.py \
      --image_path /Users/ryanzotti/Data/self-driving-car-tape/data/dataset_18_20-05-17/238_camera-image_array_.png \
      --image_scale 1.0 \
      --crop 70
"""

ap = argparse.ArgumentParser()
ap.add_argument(
    "--image_path",
    required=True,
    help="Path to the image you want to show"
)

ap.add_argument(
    "--image_scale",
    required=True,
    help="Factor to scale image. Between 0.0 and 1.0",
    default=1.0
)

ap.add_argument(
    "--crop",
    required=True,
    help="Percent to take off the top of the image",
    default=70
)

args = vars(ap.parse_args())
image_path = args['image_path']
image_scale = float((args['image_scale']))
crop_percent = int(args['crop']) / 100.0

# Read image from disk
frame = cv2.imread(image_path)

resized_images = resize_images(
    crop_images(
        images=[frame],
        crop_percent=25
    ),
    scale=image_scale
)

cv2.imshow('frame', resized_images[0])

cv2.waitKey(0)
cv2.destroyAllWindows()
