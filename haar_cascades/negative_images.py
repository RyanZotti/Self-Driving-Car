import cv2
import numpy as np
from random import randint

negative_image_file_path = "/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_data_3_channels.npz"
output_path = "/Users/ryanzotti/Documents/repos/opencv-haar-classifier-training/negative_images"
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
    #cv2.imshow(str(random_index),random_image)
    random_image_file_name = output_path+"/random_image_"+str(i)+".jpg"
    cv2.imwrite(random_image_file_name, random_image)
print("Finished")