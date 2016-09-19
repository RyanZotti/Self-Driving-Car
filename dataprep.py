import numpy as np
import cv2
import re
import os
from datetime import datetime
import collections
from random import shuffle

def make_gamma_tables(gammas):
    gamma_map = collections.OrderedDict()
    for gamma in gammas:
        # build a lookup table mapping the pixel values [0, 255] to
        # their adjusted gamma values
        invGamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** invGamma) * 255
                          for i in np.arange(0, 256)]).astype("uint8")
        gamma_map[gamma] = table
    return gamma_map

def adjust_gamma(image, table):
	# apply gamma correction using the lookup table
	return cv2.LUT(image, table)

def process_session(session_path,gamma_map,rgb=True):

    # Overlay target images for visual troubleshooting of processed video
    image_path = str(os.path.dirname(os.path.realpath(__file__))) + "/arrow_key_images"
    up_arrow = cv2.imread(image_path + '/UpArrow.tif')
    left_arrow = cv2.imread(image_path + '/LeftArrow.tif')
    right_arrow = cv2.imread(image_path + '/Right Arrow.tif')

    cap = cv2.VideoCapture(session_path + "/output.mov")
    video_timestamps = []
    with open(session_path + '/video_timestamps.txt') as video_timestamps_reader:
        for line in video_timestamps_reader:
            line = line.replace("\n", "")
            ts = datetime.strptime(line, '%Y-%m-%d %H:%M:%S.%f')
            video_timestamps.append(ts)

    commands = []
    with open(session_path + '/clean_session.txt') as clean_session_reader:
        for line in clean_session_reader:
            line = line.replace("\n", "")

            # Ignore / skip all invalid commands
            if "down" in line:
                continue
            if "left" in line and "right" in line:
                continue
            if "left" in line and "up" in line:
                continue
            if "right" in line and "up" in line:
                continue
            if "left" in line and "up" in line and "right" in line:
                continue

            match = re.match(r"^.*\['(.*)'\].*$", line)
            if match is not None:
                command = match.group(1)
            else:
                command = 'no command'
            raw_ts = line[line.index(" ") + 1:]
            ts = datetime.strptime(raw_ts, '%Y-%m-%d %H:%M:%S.%f')
            commands.append([command, ts])

    # time after which no other data is relevant because driving session has ended
    end_time = commands[len(commands) - 1][1]

    # cleanup to track only command transitions
    compact_commands = []
    prev_command = None
    for item in commands:
        command, ts = item[0], item[1]
        if command != prev_command and command != 'no command' and command != 'down':
            compact_commands.append([command, ts])
            prev_command = command
    commands = compact_commands

    # time before which no other data is relevant because driving session just started
    start_time = commands[0][1]

    current_command = commands[0][0]
    command_counter = 1
    future_command = commands[command_counter][0]
    future_command_ts = commands[command_counter][1]

    predictors = []
    targets = []

    frame_counter = -1
    while (cap.isOpened()):
        frame_counter = frame_counter + 1
        ret, frame = cap.read()
        if cv2.waitKey(1) & 0xFF == ord('q'):  # don't remove this if statement or video feed will die
            break
        video_timestamp = video_timestamps[frame_counter]
        if video_timestamp > start_time:
            if video_timestamp < end_time:
                if video_timestamp > future_command_ts:
                    current_command = future_command
                    command_counter = command_counter + 1
                    if command_counter < len(commands):
                        future_command = commands[command_counter][0]
                        future_command_ts = commands[command_counter][1]
                    else:
                        future_command = "END"
                        future_command_ts = end_time

                target = [0, 0, 0]  # in order: left, up, right
                key_image = None
                if current_command == 'left':
                    target[0] = 1
                    key_image = left_arrow
                elif current_command == 'up':
                    target[1] = 1
                    key_image = up_arrow
                elif current_command == 'right':
                    target[2] = 1
                    key_image = right_arrow

                if rgb == True:
                    for gamma, gamma_table in gamma_map.items():
                        gamma_image = adjust_gamma(frame, gamma_table)
                        targets.append(target)
                        predictors.append(gamma_image)
                else:
                    for gamma, gamma_table in gamma_map.items():
                        bw_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                        #half_image = bw_frame[120:, :]
                        #cv2.imshow(str(gamma), half_image)
                        #print(half_image.shape)
                        #bw_frame = half_image
                        gamma_image = adjust_gamma(bw_frame, gamma_table)
                        #gamma_image = np.reshape(gamma_image, [120, 320, 1])
                        gamma_image = np.reshape(gamma_image, [240, 320, 1])
                        targets.append(target)
                        predictors.append(gamma_image)
                        #cv2.imshow(str(gamma), gamma_image)

                # Uncomment below if you want to increase display (looks very pixelated/ugly)
                #frame_scale = 2
                #arrow_key_scale = 0.25v
                #frame = cv2.resize(frame, None, fx=frame_scale, fy=frame_scale, interpolation=cv2.INTER_CUBIC)

                # Display target key for visual debugging
                # The original image is huge, so I need to rescale it
                arrow_key_scale = 0.125
                resized_image = cv2.resize(key_image, None, fx=arrow_key_scale, fy=arrow_key_scale, interpolation=cv2.INTER_CUBIC)

                # Thresholding requires grayscale only, so that threshold only needs to happen in one dimension
                img2gray = cv2.cvtColor(resized_image, cv2.COLOR_BGR2GRAY)

                # Create mask where anything greater than 240 bright is made super white (255) / selected
                ret, mask = cv2.threshold(img2gray, 240, 255, cv2.THRESH_BINARY)

                # TODO: understand how this copy-pasted OpenCV masking code works
                mask_inv = cv2.bitwise_not(mask) # invert the mask
                rows, cols, channels = resized_image.shape # get size of image
                region_of_interest = frame[0:rows, 0:cols]
                img1_bg = cv2.bitwise_and(region_of_interest, region_of_interest, mask=mask) # ???
                img2_fg = cv2.bitwise_and(resized_image, resized_image, mask=mask_inv) # ???
                dst = cv2.add(img1_bg, img2_fg) # ???
                frame[0:rows, 0:cols] = dst

                # Finally, show image with the an overlay of identified target key image
                cv2.imshow('frame', frame)

            else:
                cap.release()
                cv2.destroyAllWindows()

    return predictors, targets


def data_prep(data_path,rgb=True):

    #gamma_map = make_gamma_tables(np.arange(1.0,3.0,0.5))
    gamma_map = make_gamma_tables([1])

    data_folders = os.listdir(data_path)
    shuffle(data_folders)
    #data_folders = data_folders[:10]
    train_folder_size = int(len(data_folders) * 0.8)

    train_predictors = []
    train_targets = []
    for folder in data_folders[:train_folder_size]:
        print("Started session: " + str(folder))
        predictors, targets = process_session(data_path+'/'+folder,gamma_map,rgb)
        train_predictors.extend(predictors)
        train_targets.extend(targets)
        print("Completed session: "+str(folder))
    train_predictors_np = np.array(train_predictors)
    train_targets_np = np.array(train_targets)

    validation_predictors = []
    validation_targets = []
    for folder in data_folders[train_folder_size:]:
        print("Started session: " + str(folder))
        predictors, targets = process_session(data_path + '/' + folder,gamma_map,rgb)
        validation_predictors.extend(predictors)
        validation_targets.extend(targets)
        print("Completed session: " + str(folder))
    validation_predictors_np = np.array(validation_predictors)
    validation_targets_np = np.array(validation_targets)

    np.savez(data_path+'/final_processed_bw_full_data', train_predictors=train_predictors_np,
             train_targets=train_targets_np,validation_predictors = validation_predictors_np,
             validation_targets = validation_targets_np)


# Built so that a 3D convolution doesn't span multiple sessions (since there is no continuity between sessions)
def video_to_rgb_npz(session_path,predictors,targets):
    np.savez(session_path + '/predictors_and_targets', predictors=predictors,targets=targets)


if __name__ == '__main__':
    data_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
    data_prep(data_path,rgb=True)
    print("Finished.")