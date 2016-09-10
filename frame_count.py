import numpy as np
import argparse
from util import shell_command, remove_file_if_exists

'''
python frame_count.py \
    -i /Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/final_processed_data_3_channels.npz \
    -o /Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/
'''

ap = argparse.ArgumentParser()
ap.add_argument("-i", "--input", required = True, help = "path to input numpy dataset")
ap.add_argument("-o", "--output", required = True, help = "path to shape output")
args = vars(ap.parse_args())
input_path = args["input"]
output_path = args["output"]
npzfile = np.load(input_path)
train_predictors = npzfile['train_predictors']
train_targets = npzfile['train_targets']

shape = train_predictors.shape
shape = shape[0]
remove_file_if_exists(output_path+'/shape')
shell_command('echo "{shape}" >> {output}/shape'.format(shape=str(shape),output=output_path))