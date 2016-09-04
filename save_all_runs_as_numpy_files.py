from dataprep import video_to_rgb_npz, make_gamma_tables, process_session
import os

data_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
data_folders = os.listdir(data_path)
gamma_map = make_gamma_tables([1]) # I should refactor-out the gamma at some point. It's not needed here
rgb = True

for folder in data_folders:
    predictors, targets = process_session(data_path + '/' + folder, gamma_map, rgb)
    video_to_rgb_npz(data_path + '/' + folder,predictors,targets)
    print("saved folder: "+str(folder))

print("Finished.")