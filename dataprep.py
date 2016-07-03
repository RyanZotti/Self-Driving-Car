import numpy as np
import cv2
import re
import os
from datetime import datetime


def process_session(session_path):

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
        if command != prev_command and command != 'no command':
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
                    print(current_command)
                cv2.imshow('frame', frame)
                predictors.append(frame)
                target = [0, 0, 0]  # in order: left, up, right
                if current_command == 'left':
                    target[0] = 1
                elif current_command == 'up':
                    target[1] = 1
                elif current_command == 'right':
                    target[2] = 1
                targets.append(target)
            else:
                cap.release()
                cv2.destroyAllWindows()

    return predictors, targets


def data_prep(data_path):

    data_folders = os.listdir(data_path)
    train_folder_size = int(len(data_folders) * 0.8)

    train_predictors = []
    train_targets = []
    for folder in data_folders[:train_folder_size]:
        predictors, targets = process_session(data_path+'/'+folder)
        train_predictors.append(predictors)
        train_targets.append(targets)
    train_predictors_np = np.array(predictors)
    train_targets_np = np.array(targets)

    validation_predictors = []
    validation_targets = []
    for folder in data_folders[train_folder_size:]:
        predictors, targets = process_session(data_path + '/' + folder)
        validation_predictors.append(predictors)
        validation_targets.append(targets)
    validation_predictors_np = np.array(predictors)
    validation_targets_np = np.array(targets)

    np.savez(data_path+'/final_processed_data', train_predictors=train_predictors_np,
             train_targets=train_targets_np,validation_predictors = validation_predictors_np,
             validation_targets = validation_targets_np)

if __name__ == '__main__':
    data_path = str(os.path.dirname(os.path.realpath(__file__))) + "/data"
    data_prep(data_path)
    print("Finished.")