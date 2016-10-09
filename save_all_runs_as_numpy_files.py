from dataprep import video_to_rgb_npz, make_gamma_tables, process_session
import os
from util import shell_command

data_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
data_folders = os.listdir(data_path)
gamma_map = make_gamma_tables([1]) # I should refactor-out the gamma at some point. It's not needed here
rgb = True

for folder in data_folders:
    cmd = 'ls '+data_path + '/' + folder
    dir_contents = str(shell_command(cmd))
    print("Started work on "+str(folder))
    print(dir_contents)
    if 'predictors_and_targets.npz' not in dir_contents:
        predictors, targets = process_session(data_path + '/' + folder, gamma_map, rgb)
        video_to_rgb_npz(data_path + '/' + folder,predictors,targets)
        print("Completed work on: "+str(folder)+". Created new npz file.")
    else:
        print("Completed work on "+str(dir)+". File already exists. No processing necessary.")
print("Finished.")