import numpy as np
import pandas as pd
import os


# H2O wants one column only for multinomial targets
# ex1: [0,0,1] -> [2]
# ex2: [1,0,0] -> [0]
# ex3: [0,1,0] -> [1]
def format_targets(df):
    df['targets']="Up"
    df.loc[(df[0]==1),'targets']="Left"
    df.loc[(df[2]==1),'targets']="Right"
    df['targets']=df['targets'].astype('category')
    return df

def separate_by_commas(row):
    line = ""
    for element in row:
        line += ","+str(element)
    line = line[1:] # skip first command (,1,2,3,4)
    return line

data_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
output_data_path = data_path + "/" + 'h2O_frame.csv'
data_folders = os.listdir(data_path)

for folder in data_folders:
    input_file_path = data_path + '/' + folder + '/predictors_and_targets.npz'
    npzfile = np.load(input_file_path)
    predictors = npzfile['predictors']
    targets = npzfile['targets']
    targets_pd = format_targets(pd.DataFrame(targets))
    targets_np = np.array([targets_pd['targets']]).T
    record_count = predictors.shape[0]
    flat_data = predictors.reshape([record_count,240*320*3])
    flat_data = np.concatenate((flat_data, targets_np), axis=1)
    flat_data = pd.DataFrame(flat_data)
    flat_data.to_csv(path_or_buf=data_path + '/' + folder + '/h2o_train.csv')
    print("Processed "+str(folder))
print("Finished.")

input_file_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data_115.npz'


# training data
train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']
train_record_count = train_predictors.shape[0]
train_predictors = train_predictors.reshape([train_record_count,240*320*3])
train_targets_pd = format_targets(pd.DataFrame(train_targets))
train_targets_np = np.array([train_targets_pd['targets']]).T
train = np.concatenate((train_predictors,train_targets_np),axis=1)
train = pd.DataFrame(train)
train.to_csv(path_or_buf='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/h2o_train.csv')

