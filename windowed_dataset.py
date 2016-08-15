import numpy as np
import random

input_file_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_data_3_channels.npz'
npzfile = np.load(input_file_path)

# training data
train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']

def shuffle_dataset(predictors, targets):
    record_count = predictors.shape[0]
    shuffle_index = np.arange(record_count)
    np.random.shuffle(shuffle_index)
    predictors = predictors[shuffle_index]
    targets = targets[shuffle_index]
    return predictors, targets

def window(batch_index,batch_size,window_size,predictors,targets):
    frame_index = batch_size * batch_index
    windowed_predictors = []
    windowed_targets = []
    for record_index in range(batch_size):
        frame_index += record_index
        windowed_predictors.append(predictors[frame_index:frame_index + window_size])
        windowed_targets.append(targets[frame_index + window_size])

    windowed_predictors = np.array(windowed_predictors)
    windowed_targets = np.array(windowed_targets)
    windowed_predictors, windowed_targets = shuffle_dataset(windowed_predictors,windowed_targets)

    '''
    for record_index in range(batch_size):
        for frame_index, frame in enumerate(windowed_predictors[record_index]):
            cv2.imshow('frame', frame)
            print()
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    '''

    return windowed_predictors, windowed_targets

# 15.83, 23.57
batch_index = 0
predictors, target = window(batch_index, 50, 50, train_predictors, train_targets)

print('test')