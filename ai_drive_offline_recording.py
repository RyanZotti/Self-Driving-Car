from util import *
from CommandCenter import CommandCenter

# This script is used to debug ai drive
# I also use it to test that CommandCenter is working. It's useful because it doesn't require live streaming data

checkpoint_dir_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/tf_visual_data/runs/10/checkpoints'
npzfile = np.load('/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/167/predictors_and_targets.npz')
images = npzfile['predictors']
labels = npzfile['targets']

command_center = CommandCenter(checkpoint_dir_path=checkpoint_dir_path)

for frame_index, frame in enumerate(images):
    command_center.put(frame)

    if command_center.prediction_qsize()>0:
        command, frame = command_center.get_command(frame)

    # Finally, show image with the an overlay of identified target key image
    cv2.imshow('prediction', frame)

    if cv2.waitKey(1) == 27:
        exit(0)

print("Finished")