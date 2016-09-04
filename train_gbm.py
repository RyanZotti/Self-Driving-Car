from sklearn.ensemble import GradientBoostingClassifier
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score

input_file_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_data_3_channels.npz'
npzfile = np.load(input_file_path)
pd.options.mode.chained_assignment = None
train_predictors = npzfile['train_predictors'].reshape(21228,230400)[:10000]
train_targets = pd.DataFrame(npzfile['train_targets'][:10000])
train_targets['target'] = 'down'
train_targets['target'][train_targets[0] == 1] = 'left'
train_targets['target'][train_targets[1] == 1] = 'up'
train_targets['target'][train_targets[2] == 1] = 'down'

validation_predictors = npzfile['validation_predictors'].reshape(6168,230400)[:1000]
validation_targets = pd.DataFrame(npzfile['validation_targets'][:1000])
validation_targets['target'] = 'down'
validation_targets['target'][validation_targets[0] == 1] = 'left'
validation_targets['target'][validation_targets[1] == 1] = 'up'
validation_targets['target'][validation_targets[2] == 1] = 'right'

gbm = GradientBoostingClassifier(learning_rate=0.01,n_estimators=300,max_depth=3)
gbm.fit(train_predictors,train_targets['target'])

train_scores = gbm.predict(train_predictors,train_targets['target'])
validation_scores = gbm.predict(validation_predictors,validation_targets['target'])

train_accuracy = accuracy_score(train_targets,train_scores)
validation_accuracy = accuracy_score(validation_targets,validation_scores)

print("train: "+str(train_accuracy)+" validation:"+str(validation_accuracy))

