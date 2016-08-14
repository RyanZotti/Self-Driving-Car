import subprocess
from os import listdir
from os.path import isfile

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


if __name__ == '__main__':
    tensorboard_basedir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/'
    cleanup(tensorboard_basedir)
    mkdir_tfboard_run_dir(tensorboard_basedir)
