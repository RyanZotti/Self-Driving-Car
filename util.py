import subprocess
from os import listdir
from os.path import isfile
import numpy as np
import os
import tensorflow as tf
from random import randint
import boto3
from pathlib import Path
import re


# Used to save space. Keeping all model checkpoint epochs can eat up many GB of disk space
def delete_old_model_backups(checkpoint_dir):
    checkpoint_files = listdir(checkpoint_dir)
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


def dead_ReLU_pct(matrix):
    zeros = (matrix.size - matrix[matrix > 0].size)
    dead_ReLU_percent = zeros / matrix.size
    return dead_ReLU_percent

def custom_summary(summary_name,summary_value):
    # Got this from here: http://stackoverflow.com/questions/37902705/how-to-manually-create-a-tf-summary
    summary = tf.Summary(value=[tf.Summary.Value(tag=summary_name, simple_value=summary_value)])
    return summary

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

def cleanup(dir):
    if 'tf_visual_data/runs/' in dir:
        sub_dirs = listdir(dir)
        for sub_dir in sub_dirs:
            if sub_dir is not isfile(sub_dir):
                files = listdir(dir+'/'+sub_dir)
                if "SUCCESS" not in files:
                    shell_command('rm -rf ' + dir + sub_dir)
    else:
        pass # do not accidentally delete entire file system!


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


def move_window(windowed_data,new_frame):
    # Add frame to end of window.
    # Oldest window is first and newest is last so that when the video is played it looks normal
    windowed_data = np.concatenate((windowed_data, new_frame), axis=0)
    # remove oldest frame, which is the first element.
    windowed_data = np.delete(windowed_data, 0, 0)
    return windowed_data


# Hopefully saves space for 3D convolution
def first_and_last_window_frames(windowed_data):
    first_frame = windowed_data[0]
    last_frame = windowed_data[len(windowed_data) - 1]
    two_frames = np.concatenate(([first_frame], [last_frame]), axis=0)
    return two_frames


# randomly selects a window from a given predictors-targets dataset
def random_window(predictors,targets,window_size):
    upper_bound = predictors.shape[0] - window_size
    random_index = randint(0, upper_bound)
    random_window_predictors = predictors[random_index:random_index + window_size]
    # -1 for the target index because this type of numpy sub-setting is inclusive whereas for predictors
    # it wasn't selected only elements before that index
    random_window_targets = targets[random_index + window_size -1]
    return random_window_predictors, random_window_targets


# randomly selects one window from one randomly selected session
def random_window_random_session(data_path,window_size):
    data_folders = listdir(data_path)
    random_index = randint(0,len(data_folders)-1)
    random_folder = data_folders[random_index]
    data_file = np.load(data_path +'/' + str(random_folder) + '/predictors_and_targets.npz')
    predictors = data_file['predictors']
    targets = data_file['targets']
    predictors, targets = random_window(predictors,targets,window_size)
    return predictors, targets


# returns randomly generated, windowed dataset for 3D convolution
def multiple_random_windows_from_random_sessions(data_path,window_size,window_count,hollow_window=True):
    predictor_windows = None # because I'm used to Java
    target_windows = None # because I'm used to Java
    for window_index in range(window_count):
        predictors, targets = random_window_random_session(data_path, window_size)
        if hollow_window:
            predictors = first_and_last_window_frames(predictors)
            # Note the absence of targets; they are snapshots and don't need hollowing
        if window_index > 0:
            predictor_windows = np.concatenate((predictor_windows,[predictors]),axis=0)
            target_windows = np.concatenate((target_windows, [targets]), axis=0)
        else:
            predictor_windows = np.array([predictors])
            target_windows = np.array([targets])
    return predictor_windows, target_windows


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


if __name__ == '__main__':
    tensorboard_basedir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/'
    abc = record_count('/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/shape')
    cleanup(tensorboard_basedir)
    mkdir_tfboard_run_dir(tensorboard_basedir)
