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


def flip_continuous(images,labels,debug=False):

    # Order of labels variables is angle, throttle. It
    # only makes sense to flip angle, so select the first
    # column, the one indexed at 0. The : means to apply
    # the transformation to all rows
    flipped_labels = labels.copy()
    flipped_labels[:, 0] = labels[:, 0] * -1
    flipped_images = []
    for image in images:
        flipped_image = cv2.flip(image, 1)
        flipped_images.append(flipped_image)
    flipped_images = np.array(flipped_images)
    if debug:
        for i in range(10):
            cv2.imshow("Original - {0}".format(labels[i,:]), images[i,:])
            cv2.imshow("Flipped - {0}".format(flipped_labels[i,:]), flipped_images[i,:])
            cv2.waitKey(0)
    return flipped_images, flipped_labels


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

def flip_enrichment_continuous(images,labels):
    image_images, new_labels = flip_continuous(images, labels, debug=False)
    images = np.vstack((images, image_images))
    labels = np.vstack((labels, new_labels))
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

def resize_images(images,scale):
    inverted_decimal_scale = 1 / scale
    resized_images = []
    for original_image in images:
        resized_image = cv2.resize(
            original_image,
            None,
            fx=inverted_decimal_scale,
            fy=inverted_decimal_scale,
            interpolation=cv2.INTER_CUBIC
        )
        resized_images.append(resized_image)
    return resized_images

# Collapses multiple data transformations; primarily used in model training scritps
def process_data_continuous(data, image_scale=1.0, crop_percent=1):
    images, labels = data[0], data[1]
    images, labels = flip_enrichment_continuous(images, labels)
    images = apply_transformations(images,image_scale,crop_percent)
    return images, labels

def crop_images(images, crop_percent):
    cropped_images = []
    # Assumes you want to keep bottom part of image and discard the top
    # In OpenCV, (0,0) represents top left pixel
    # https://stackoverflow.com/a/25644503/554481
    for original_image in images:
        shape = original_image.shape
        new_top_position = int(shape[0]) - int(shape[0] * (crop_percent / 100.0))
        new_bottom_position = int(shape[0])
        cropped_image = original_image[new_top_position:new_bottom_position]
        cropped_images.append(cropped_image)
    return cropped_images


# https://www.pyimagesearch.com/2016/03/07/transparent-overlays-with-opencv/
def pseduo_crop(image, crop_percent, alpha):
    shape = image.shape
    new_top_position = int(shape[0]) - int(shape[0] * (crop_percent / 100.0))

    # Create two copies of the original image -- one for
    # the overlay and one for the final output image
    overlay = image.copy()
    output = image.copy()

    # Draw a white rectangle over the cropped area
    # Open CV's coordinate system:
    # https://stackoverflow.com/a/25644503/554481
    '''
    0/0---column--->
     |
     |
    row
     |
     |
     v
    '''
    top_left_corner = (0, 0)
    bottom_right_corner = (shape[1], new_top_position)
    rgb_color = (255, 255, 255)
    cv2.rectangle(
        overlay,
        top_left_corner,
        bottom_right_corner,
        rgb_color,
        -1
    )

    # Apply the overlay
    cv2.addWeighted(
        overlay,
        alpha,
        output,
        1 - alpha,
        0,
        output
    )

    return output


# I've separated this from `process_data` so that I can use it in both training
# and scoring. Relying on process_data alone wasn't sufficient for scoring
# because during scoring the true labels aren't known at runtime
def apply_transformations(images, image_scale, crop_percent):
    images = normalize_contrast(images)
    images = images / 255
    if crop_percent > 0:
        images = crop_images(
            images=images,
            crop_percent=crop_percent
        )
    if image_scale != 1:
        images = resize_images(
            images=images,
            scale=image_scale
        )
    return images

def show_resize_effect(original_image, scale):
    smaller_scale = 1/scale
    shrunken_image = cv2.resize(original_image, None, fx=smaller_scale, fy=smaller_scale, interpolation=cv2.INTER_CUBIC)
    enlarged_image = cv2.resize(shrunken_image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    return enlarged_image
