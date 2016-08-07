import subprocess


def dir_count(dir):
    shell_cmd = 'ls -ltr {dir} | wc -l'.format(dir=dir)
    cmd_result = subprocess.check_output(shell_cmd, shell=True).strip()
    cmd_result = str(cmd_result).replace('b', '').replace("\'", "")
    return cmd_result


def mkdir(dir):
    shell_cmd = 'mkdir -p {dir}'.format(dir=dir)
    subprocess.check_output(shell_cmd, shell=True).strip()


def mkdir_tensorobard_dir(tensorboard_basedir):
    old_run_index = int(dir_count(tensorboard_basedir))
    new_run_index = str(old_run_index + 1)
    mkdir(tensorboard_basedir + new_run_index+'/train/')
    mkdir(tensorboard_basedir + new_run_index + '/validation/')

if __name__ == '__main__':
    tensorboard_basedir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/'
    mkdir_tensorobard_dir(tensorboard_basedir)
