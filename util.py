import subprocess
from os import listdir
from os.path import isfile
import numpy as np
import os

def remove_file_if_exists(file_path):
    if os.path.exists(file_path):
        os.remove(file_path)

def dir_count(dir):
    shell_cmd = 'ls -ltr {dir} | wc -l'.format(dir=dir)
    cmd_result = subprocess.check_output(shell_cmd, shell=True).strip()
    cmd_result = str(cmd_result).replace('b', '').replace("\'", "")
    return cmd_result


def mkdir(dir):
    shell_cmd = 'mkdir -p {dir}'.format(dir=dir)
    subprocess.check_output(shell_cmd, shell=True).strip()
    return dir


def mkdir_tfboard_run_dir(tf_basedir,):
    old_run_index = int(dir_count(tf_basedir))
    new_run_index = str(old_run_index + 1)
    new_run_dir = tf_basedir + new_run_index
    mkdir(new_run_dir)
    return new_run_dir

def shell_command(cmd):
    cmd_result = subprocess.check_output(cmd, shell=True).strip()
    return cmd_result


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


def window(batch_index,batch_size,window_size,predictors,targets):
    frame_index = batch_size * batch_index
    windowed_predictors = []
    windowed_targets = []
    for record_index in range(batch_size):
        frame_index += record_index
        windowed_predictors.append(predictors[frame_index:frame_index + window_size])
        windowed_targets.append(targets[frame_index + window_size])
    windowed_predictors = np.array(windowed_predictors)
    windowed_targets = np.array(windowed_targets)
    windowed_predictors, windowed_targets = shuffle_dataset(windowed_predictors,windowed_targets)
    return windowed_predictors, windowed_targets

def windowed_dataset(inpt,otpt,bindx,pred_nm,trgt_nm):
    cmd = '''python windowed_dataset.py -i {inpt} -o {otpt} -b {bindx} -p {pred_nm} -t {trgt_nm}
          '''.format(inpt=inpt,otpt=otpt,bindx=bindx,pred_nm=pred_nm,trgt_nm=trgt_nm)
    shell_command(cmd)
    npzfile = np.load(otpt+'/window.npz')
    predictors = npzfile[pred_nm]
    targets = npzfile[trgt_nm]
    return predictors, targets


def record_count(file_path):
    result = int(str(shell_command('cat '+file_path)).replace("b","").replace("'",""))
    return result

if __name__ == '__main__':
    tensorboard_basedir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/'
    abc = record_count('/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/shape')
    cleanup(tensorboard_basedir)
    mkdir_tfboard_run_dir(tensorboard_basedir)
