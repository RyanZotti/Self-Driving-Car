import cv2
import numpy as np

input_file_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_data_3_channels.npz'
npzfile = np.load(input_file_path)

train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']

print(train_predictors.shape)

for frame_index, frame in enumerate(train_predictors):

    cv2.imshow('frame', frame)

    # This line is necessary or else it will look like the frames are frozen
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
