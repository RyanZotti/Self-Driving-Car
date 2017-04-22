import numpy as np
import cv2


def flip(images,labels,original_command,debug=False):
    if original_command.lower() == 'left':
        target_index = 0
        new_target_row = [0, 0, 1]
        new_command = 'right'
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
    new_right_predictors, new_right_target = flip(images, labels, 'left', debug=False)
    new_left_predictors, new_left_target = flip(images, labels, 'right', debug=False)
    new_images, new_labels = [], []
    if len(new_right_predictors) > 0 and len(new_left_predictors) > 0:
        new_images = np.vstack((new_right_predictors, new_left_predictors))
        new_labels = np.vstack((new_right_target, new_left_target))
    elif len(new_right_predictors) > 0:
        new_images = new_right_predictors
        new_labels = new_right_target
    elif len(new_left_predictors) > 0:
        new_images = new_left_predictors
        new_labels = new_left_target
    if len(new_images) > 0:
        images = np.vstack((images,new_images))
        labels = np.vstack((labels,new_labels))
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