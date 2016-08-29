import numpy as np
from util import shuffle_dataset

data_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car'
npzfile = np.load(data_path+'/final_processed_data_3_channels.npz')

train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']
train_predictors, train_targets = shuffle_dataset(train_predictors, train_targets)
train_predictors = train_predictors[:5000]
train_targets = train_targets[:5000]

validation_predictors = npzfile['validation_predictors']
validation_targets = npzfile['validation_targets']
validation_predictors, validation_targets = shuffle_dataset(validation_predictors, validation_targets)
validation_predictors = validation_predictors[:2000]
validation_targets = validation_targets[:2000]

np.savez(data_path + '/training', predictors=train_predictors,targets=train_targets)
np.savez(data_path + '/validation', predictors=validation_predictors,targets=validation_targets)

print("Finished")