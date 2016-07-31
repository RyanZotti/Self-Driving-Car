import cv2
import numpy as np

input_file_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_data_3_channels_gamma.npz'
npzfile = np.load(input_file_path)

train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']

print(train_predictors.shape)

for frame_index, frame in enumerate(train_predictors):
    print(frame_index)
    cv2.imshow('frame', frame)

