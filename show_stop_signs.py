import cv2
import sys
from util import shell_command
import numpy as np
from random import randint


def process_image_set(dir,pixel_size):
    processed_images = []
    for file_name in file_names:
        image = cv2.imread(dir + "/" + file_name)
        height, width = image.shape[0], image.shape[1]
        if width == height:
            resized = cv2.resize(image, (pixel_size, pixel_size), interpolation=cv2.INTER_AREA)
            processed_images.append(resized)
        else:
            print(file_name + " is not a square! It has dimensions " + str(image.shape))
            sys.exit(1)
    processed_images = np.array(processed_images)
    return processed_images

# Generates negative images from previous driving session.
def random_negative_images():
    pass

pixel_size = 24

# Assumes positive images are each separate files
positive_image_dir = "/Users/ryanzotti/Dropbox/StopSigns"
shell_cmd = 'ls {dir}'.format(dir=positive_image_dir)
dir_contents = str(shell_command(shell_cmd)).replace("b\'","").split("\\n")
file_names = [file_name for file_name in dir_contents if "JPG" in file_name]
positive_images = process_image_set(positive_image_dir,pixel_size)

# Assumes negative images are taken from existing numpy zip file.
# I used my training data. This is ideal because it is
# representive of backgrounds that I would realistically see in a
# production setting
negative_image_file_path = "/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_data_3_channels.npz"
npzfile = np.load(negative_image_file_path)
train_predictors = npzfile['train_predictors']
shape = train_predictors.shape
total_frames = shape[0]
height, width = shape[1], shape[2]
negative_images = []
negative_images_count = 3000
for i in range(negative_images_count):
    random_index = randint(0, total_frames)
    random_image = train_predictors[random_index]
    cv2.imshow(str(random_index),random_image)
    height_bound = height - 24
    width_bound = width - 24
    random_height_start = randint(0,height_bound)
    random_height_end = random_height_start + pixel_size
    random_width_start = randint(0,width_bound)
    random_width_end = random_width_start + pixel_size
    random_image_section = random_image[random_height_start:random_height_end,random_width_start:random_width_end]
    negative_images.append(random_image_section)
negative_images = np.array(negative_images)
#np.savez(session_path + '/predictors_and_targets', predictors=predictors,targets=targets)

print("Finished")
