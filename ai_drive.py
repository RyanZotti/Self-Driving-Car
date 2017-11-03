import argparse
from util import *
from haar_cascades.haar_cascade_webcam import detect_stop_sign
from CommandCenter import CommandCenter


# Parse CLI args
ap = argparse.ArgumentParser()
ap.add_argument("-i", "--ip_address", required=True, help="Raspberry Pi ip address")
ap.add_argument("-c", "--model_dir", required=True, help="Path to model checkpoint directory")
args = vars(ap.parse_args())
checkpoint_dir_path = args['model_dir']
ip = args['ip_address']

# Command Center keep a copy of the model and issues all commands
command_center = CommandCenter(checkpoint_dir_path=checkpoint_dir_path, ip=ip)

for frame in live_video_stream(ip):

    # Add frame to prediction queue to avoid blocking future frames
    command_center.put(frame)

    # Car should not do anything without a command
    if command_center.prediction_visualization_qsize() > 0:
        command, frame = command_center.get_command(frame)

        # Tell the car to move if no overriding safety rules apply (e.g., obstacle, stop sign)
        frame = detect_stop_sign(frame)  # TODO: Actually top if stop sign detected

    cv2.imshow('frame', frame)