import numpy as np
import cv2


def flip(images,labels,original_command,debug=False):
    if original_command.lower() == 'left':
        target_index = 0
        new_target_row = [0, 0, 1]
        new_command = 'right'
    elif original_command.lower() == 'up':
        target_index = 1
        new_target_row = [0, 1, 0]
        new_command = 'up'
    elif original_command.lower() == 'right':
        target_index = 2
        new_target_row = [1, 0, 0]
        new_command = 'left'
    flippables = images[np.where(labels[:, target_index] == 1)]
    if len(flippables) == 0:
        return [], []
    flipped_images = []
    new_target_array = []
    for image in flippables:
        flipped_image = cv2.flip(image, 1)
        flipped_images.append(flipped_image)
        new_target_array.append(new_target_row)
    flipped_images = np.array(flipped_images)
    new_target_array = np.array(new_target_array)
    if debug:
        for i in range(10):
            cv2.imshow("Original - {0} - {1}".format(original_command,i), flippables[i])
            cv2.imshow("Flipped - {0} - {1}".format(new_command,i), flipped_images[i])
            cv2.waitKey(0)
    return flipped_images, new_target_array


def flip_enrichment(images,labels):
    new_right_images, new_right_labels = flip(images, labels, 'left', debug=False)
    new_left_images, new_left_labels = flip(images, labels, 'right', debug=False)
    new_up_images, new_up_labes = flip(images, labels, 'up', debug=False)
    if len(new_right_images) > 0:
        images = np.vstack((images, new_right_images))
        labels = np.vstack((labels, new_right_labels))
    if len(new_left_images) > 0:
        images = np.vstack((images, new_left_images))
        labels = np.vstack((labels, new_left_labels))
    if len(new_up_images) > 0:
        images = np.vstack((images, new_up_images))
        labels = np.vstack((labels, new_up_labes))
    return images, labels


def normalize_contrast(images):
    normalized_images = []
    for image in images:
        img_yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
        # equalize the histogram of the Y channel
        img_yuv[:, :, 0] = cv2.equalizeHist(img_yuv[:, :, 0])
        # convert the YUV image back to RGB format
        normalized_image = cv2.cvtColor(img_yuv, cv2.COLOR_YUV2BGR)
        normalized_images.append(normalized_image)
    normalized_images = np.array(normalized_images)
    return normalized_images


# Collapses multiple data transformations; primarily used in model training scritps
def process_data(data):
    images, labels = data[0], data[1]
    images, labels = flip_enrichment(images, labels)
    images = apply_transformations(images)
    return images, labels


# I've separated this from `process_data` so that I can use it in both training
# and scoring. Relying on process_data alone wasn't sufficient for scoring
# because during scoring the true labels aren't known at runtime
def apply_transformations(images):
    images = normalize_contrast(images)
    images = images / 255
    return images