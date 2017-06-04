from dataprep import video_to_rgb_npz, make_gamma_tables, process_session
import numpy as np
import os
from util import shell_command, sanitize_data_folders


def write_metadata(input_dir_path):
    input_file_path = input_dir_path + '/predictors_and_targets.npz'
    npzfile = np.load(input_file_path)
    image_count = len(npzfile['predictors'])
    metadata_file_path = input_dir_path + '/metadata.txt'
    with open(metadata_file_path, 'w') as writer:
        writer.write('image_count:' + str(image_count) + '\n')


data_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
data_folders = os.listdir(data_path)
data_folders = sanitize_data_folders(data_folders)
gamma_map = make_gamma_tables([1]) # I should refactor-out the gamma at some point. It's not needed here
rgb = True

for folder in data_folders:
    cmd = 'ls '+data_path + '/' + folder
    dir_contents = str(shell_command(cmd))
    print("Started work on "+str(folder))
    print(dir_contents)
    input_dir_path = data_path + '/' + folder
    if 'predictors_and_targets.npz' not in dir_contents:
        predictors, targets = process_session(data_path + '/' + folder, gamma_map, rgb)
        video_to_rgb_npz(input_dir_path,predictors,targets)
        print("Completed work on: "+str(folder)+". Created new npz and metadata files.")
        write_metadata(input_dir_path)
    elif 'metadata.csv' not in dir_contents:
        write_metadata(input_dir_path)
        print("Added only metadata file for: " + str(folder) + ".")
    else:
        print("Completed work on "+str(dir)+". File already exists. No processing necessary.")
print("Finished.")