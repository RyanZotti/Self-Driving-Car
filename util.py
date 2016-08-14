import subprocess


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


def cp(a,b):
    shell_cmd = 'cp {from_here} {to_there}'.format(from_here=a,to_there=b)
    cmd_result = subprocess.check_output(shell_cmd, shell=True).strip()

def shell_command(cmd):
    cmd_result = subprocess.check_output(cmd, shell=True).strip()
    return cmd_result

if __name__ == '__main__':
    tensorboard_basedir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/tf_visual_data/runs/'
    mkdir_tfboard_run_dir(tensorboard_basedir)
