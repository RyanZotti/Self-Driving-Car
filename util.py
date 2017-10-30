import cv2
import subprocess
from os import listdir
import numpy as np
import os
import boto3
from pathlib import Path
import re
import urllib.request


# Used to save space. Keeping all model checkpoint epochs can eat up many GB of disk space
def delete_old_model_backups(checkpoint_dir):
    checkpoint_files = listdir(checkpoint_dir)
    if len(checkpoint_files) > 0:
        keep_files = ['checkpoint']
        checkpoint_files = list(set(checkpoint_files) - set(keep_files))
        numbers = []
        for checkpoint_file in checkpoint_files:
            parsed_regex = re.search('(?<=-)[0-9]+(?=\.)', checkpoint_file)
            regex_result = parsed_regex.group(0)
            numbers.append(regex_result)
        latest_checkpoint = max(numbers)
        delete_files = []
        for checkpoint_file in checkpoint_files:
            if latest_checkpoint not in checkpoint_file:
                delete_files.append(checkpoint_file)
            else:
                keep_files.append(checkpoint_file)
        for delete_file in delete_files:
            delete_file_path = os.path.join(checkpoint_dir, delete_file)
            cmd = 'rm ' + delete_file_path
            shell_command(cmd)


def remove_file_if_exists(file_path):
    if os.path.exists(file_path):
        os.remove(file_path)

def dir_count(dir):
    shell_cmd = 'ls {dir}'.format(dir=dir)
    digits = [0]
    try:
        cmd_result = subprocess.check_output(shell_cmd, shell=True).strip()
        dirs = str(cmd_result).replace('b', '').replace("\'", "")

        for dir in dirs.split('\\n'):
            if dir.isdigit():
                digit = int(dir)
                digits.append(digit)
    except:
        mkdir(dir)
    newest_dir = max(digits)
    return newest_dir


def sanitize_data_folders(folders):
    sanitized_folders = []
    for folder in folders:
        if folder.isdigit():
            sanitized_folders.append(folder)
    return sanitized_folders


def mkdir(dir):
    shell_cmd = 'mkdir -p {dir}'.format(dir=dir)
    subprocess.check_output(shell_cmd, shell=True).strip()
    return dir


def mkdir_tfboard_run_dir(tf_basedir,):
    newest_dir = dir_count(tf_basedir)
    new_dir = str(newest_dir + 1)
    new_run_dir = os.path.join(tf_basedir, str(new_dir))
    mkdir(new_run_dir)
    return new_run_dir


def shell_command(cmd,print_to_stdout=False):
    if not print_to_stdout:
        cmd_result = subprocess.check_output(cmd, shell=True).strip()
        return cmd_result
    else:  # Used when the command will take a long time (e.g., `aws sync`) and progress updates would be helpful
        cmd = cmd.split(' ')
        p = subprocess.Popen(cmd,
                             stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT)
        for line in iter(p.stdout.readline, b''):
            print(line.rstrip())


def upload_s3_file(source_path,bucket_name,target_path):
    s3 = boto3.client('s3')
    s3.upload_file(source_path, bucket_name, target_path)


def shuffle_dataset(predictors, targets):
    record_count = predictors.shape[0]
    shuffle_index = np.arange(record_count)
    np.random.shuffle(shuffle_index)
    predictors = predictors[shuffle_index]
    targets = targets[shuffle_index]
    return predictors, targets

def record_count(file_path):
    result = int(str(shell_command('cat '+file_path)).replace("b","").replace("'",""))
    return result


def file_is_in_s3(bucket_name,full_path_to_file):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket_name)
    answer = False
    for obj in bucket.objects.page_size(100):
        if full_path_to_file in str(obj):
            answer = True
            break
    return answer


def file_is_stored_locally(full_path_to_file):
    file_exists = False
    my_file = Path(full_path_to_file)
    if my_file.is_file():
        file_exists = True
    return file_exists


def summarize_metadata(data_path,include_folders=None):
    data_folders = sanitize_data_folders(os.listdir(data_path))
    summaries = {}
    metadata = {}
    for folder in data_folders:
        input_file_path = data_path + '/' + folder + '/metadata.txt'
        if include_folders is not None:
            if folder not in include_folders:
                continue
        with open(input_file_path) as fp:
            metadata[folder] = {}
            for line in fp:
                line = line.strip()
                if ':' in line:
                    key = line.split(":")[0]
                    value = int(line.split(":")[1])
                    metadata[folder][key]=value
                    if key in summaries:
                        summaries[key] += value
                    else:
                        summaries[key] = value
    return summaries, metadata


# Reads last epoch from checkpoint path
def get_prev_epoch(checkpoint_dir_path):
    cmd = 'ls {dir} | grep -i .index'.format(dir=checkpoint_dir_path)
    files = str(shell_command(cmd))
    raw_results = re.findall('model-(.*?).index', files, re.DOTALL)
    sanitized_epochs = []
    for result in raw_results:
        if result.isdigit():
            sanitized_epochs.append(int(result))
    prev_epoch = max(sanitized_epochs)
    return prev_epoch


def sync_from_aws(s3_path,local_path):
    command = 'aws s3 sync {s3_path} {local_path}'.format(s3_path=s3_path,local_path=local_path)
    shell_command(cmd=command,print_to_stdout=True)


def sync_to_aws(s3_path,local_path):
    command = 'aws s3 sync {local_path} {s3_path}'.format(s3_path=s3_path,local_path=local_path)
    shell_command(cmd=command,print_to_stdout=True)


# Shows command (arrow key) on top of image frame
def overlay_command_on_image(frame, command,left_arrow, up_arrow,right_arrow):
    key_image = None
    if command == 'left':
        key_image = left_arrow
    elif command == 'up':
        key_image = up_arrow
    elif command == 'right':
        key_image = right_arrow
    arrow_key_scale = 0.125
    resized_image = cv2.resize(key_image, None, fx=arrow_key_scale, fy=arrow_key_scale, interpolation=cv2.INTER_CUBIC)

    # Thresholding requires grayscale only, so that threshold only needs to happen in one dimension
    img2gray = cv2.cvtColor(resized_image, cv2.COLOR_BGR2GRAY)

    # Create mask where anything greater than 240 bright is made super white (255) / selected
    ret, mask = cv2.threshold(img2gray, 240, 255, cv2.THRESH_BINARY)

    # TODO: understand how this copy-pasted OpenCV masking code works
    mask_inv = cv2.bitwise_not(mask)  # invert the mask
    rows, cols, channels = resized_image.shape  # get size of image
    region_of_interest = frame[0:rows, 0:cols]
    img1_bg = cv2.bitwise_and(region_of_interest, region_of_interest, mask=mask)  # ???
    img2_fg = cv2.bitwise_and(resized_image, resized_image, mask=mask_inv)  # ???
    dst = cv2.add(img1_bg, img2_fg)  # ???
    frame[0:rows, 0:cols] = dst
    return frame


# This is used to stream video live for the self-driving sessions
# The syntax is super ugly and I don't understand how it works
# This is where I got this code from here, which comes with an explanation:
# https://stackoverflow.com/questions/21702477/how-to-parse-mjpeg-http-stream-from-ip-camera
def live_video_stream(ip):
    stream = urllib.request.urlopen('http://{ip}/webcam.mjpeg'.format(ip=ip))
    opencv_bytes = bytes()
    while True:
        opencv_bytes += stream.read(1024)
        a = opencv_bytes.find(b'\xff\xd8')
        b = opencv_bytes.find(b'\xff\xd9')
        if a != -1 and b != -1:
            jpg = opencv_bytes[a:b + 2]
            opencv_bytes = opencv_bytes[b + 2:]
            frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if cv2.waitKey(1) == 27:
                exit(0)
            yield frame