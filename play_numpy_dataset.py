import argparse
import cv2
import numpy as np
from dataprep import show_image_with_command, \
    get_key_image_from_array

# python play_numpy_dataset.py --datapath /Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/144/predictors_and_targets.npz --show_arrow_keys y
ap = argparse.ArgumentParser()
ap.add_argument("-d", "--datapath", required=False,
                help="Path to all of the data",
                default='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/144/predictors_and_targets.npz')
ap.add_argument("-s", "--show_arrow_keys", required=False,
                help="Display arrow keys?",
                default='y')
args = vars(ap.parse_args())
data_path = args["datapath"]
show_arrow_keys = True if args['show_arrow_keys'].lower() == 'y' else False

npzfile = np.load(data_path)
images = npzfile['predictors']
labels = npzfile['targets']
print(show_arrow_keys)
for frame_index, frame in enumerate(images):

    if show_arrow_keys:
        label = labels[[frame_index]]
        key_image = get_key_image_from_array(label)
        show_image_with_command(frame, key_image)
    else:
        cv2.imshow('frame', frame)

    # This line is necessary or else it will look like the frames are frozen
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
