import cv2
"""
Using from tensorflow.keras.models import model_from_json
instead of from tensorflow.keras.models import load_model fixes
an error in multithreaded environments like Tornado and
Flask. The error looks like this:
AttributeError: '_thread._local' object has no attribute 'value'
Source; https://github.com/keras-team/keras/issues/13353#issuecomment-568208728
"""
from tensorflow.keras.models import load_model
from keras.backend.tensorflow_backend import clip
import numpy as np
import os
import psycopg2
import psycopg2.extras
import re
import subprocess
import urllib.request


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


def file_is_stored_locally(full_path_to_file):
    file_exists = False
    if os.path.exists(full_path_to_file):
        file_exists = True
    return file_exists


def mkdir_tfboard_run_dir(tf_basedir,):
    newest_dir = dir_count(tf_basedir)
    new_dir = str(newest_dir + 1)
    new_run_dir = os.path.join(tf_basedir, str(new_dir))
    mkdir(new_run_dir)
    return new_run_dir


def mkdir(dir):
    shell_cmd = 'mkdir -p {dir}'.format(dir=dir)
    subprocess.check_output(shell_cmd, shell=True).strip()
    return dir


def sync_from_aws(s3_path,local_path):
    command = 'aws s3 sync {s3_path} {local_path}'.format(s3_path=s3_path,local_path=local_path)
    shell_command(cmd=command,print_to_stdout=True)


def sync_to_aws(s3_path,local_path):
    command = 'aws s3 sync {local_path} {s3_path}'.format(s3_path=s3_path,local_path=local_path)
    shell_command(cmd=command,print_to_stdout=True)


def shell_command(cmd,print_to_stdout=False):
    if not print_to_stdout:
        cmd_result = subprocess.check_output(cmd, shell=True).strip()
        return cmd_result
    else:  # Used when the command will take a long time (e.g., `aws sync`) and progress updates would be helpful
        cmd = cmd.split(' ')
        p = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT
        )
        for line in iter(p.stdout.readline, b''):
            print(line.rstrip())

def connect_to_postgres(host):
    connection_string = "host='{host}' dbname='autonomous_vehicle' user='postgres' password='' port=5432".format(
        host=host
    )
    connection = psycopg2.connect(connection_string)
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    return connection, cursor


def execute_sql(host, sql, postgres_pool=None):
    if postgres_pool:
        connection = postgres_pool.getconn()
        cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(sql)
        cursor.close()
        # Use this method to release the connection object and send back to the connection pool
        postgres_pool.putconn(connection)
    else:
        connection, cursor = connect_to_postgres(host=host)
        cursor.execute(sql)
        connection.commit()
        cursor.close()
        connection.close()

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


def load_keras_model(file_path):
    """
    Load a saved model

    Parameters
    ----------
    file_path : string
        The full path to the hdf5 model checkpoint file
        Example:
            ~/models/23/model.hdf5

    Returns
    ----------
    loaded_model : Keras model
        The saved model

    """

    """
    This is how Keras wants you to add import custom layers. Otherwise you'll get
    this error: "keras load model NameError: name 'clip' is not defined"
    Official docs: "Handling custom layers (or other custom objects) in saved models"
    https://keras.io/getting-started/faq/#how-can-i-save-a-keras-model
    """
    loaded_model = load_model(
        file_path,
        custom_objects={'clip': clip}
    )
    return loaded_model

# Used to save space. Keeping all model checkpoint epochs can eat up many GB of disk space
def delete_old_model_backups(checkpoint_dir):
    checkpoint_files = os.listdir(checkpoint_dir)
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


def get_sql_rows(host, sql, postgres_pool=None):
    if postgres_pool:
        connection = postgres_pool.getconn()
        cursor = connection.cursor(cursor_factory = psycopg2.extras.RealDictCursor)
        cursor.execute(sql)
        rows = cursor.fetchall()
        cursor.close()
        # Use this method to release the connection object and send back to the connection pool
        postgres_pool.putconn(connection)
        return rows
    else:
        connection, cursor = connect_to_postgres(host=host)
        cursor.execute(sql)
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        return rows

# This is used to stream video live for the self-driving sessions
# The syntax is super ugly and I don't understand how it works
# This is where I got this code from here, which comes with an explanation:
# https://stackoverflow.com/questions/21702477/how-to-parse-mjpeg-http-stream-from-ip-camera
def live_video_stream(ip, port, no_change_count_threshold=50):
    stream = urllib.request.urlopen('http://{ip}:{port}/video'.format(ip=ip, port=port))
    opencv_bytes = bytes()
    """
    When the video is streaming well, about 1 of every 15
    iterations of this loop produces an image. When the
    video is killed and there is nothing to show, the else
    part of the loop gets called consecutively indefinitely.
    I can avoid the zombie threads that take over my entire
    Tornado server (99% of CPU) if I check a consecutive
    failure count exceeding some arbitrarily high threshold
    """
    consecutive_no_image_count = 0
    was_available = False
    while True:
        opencv_bytes += stream.read(1024)
        jpeg_frame_start_marker = opencv_bytes.find(b'\xff\xd8')
        jpeg_frame_end_market = opencv_bytes.find(b'\xff\xd9')
        if jpeg_frame_start_marker != -1 and jpeg_frame_end_market != -1:
            jpg = opencv_bytes[jpeg_frame_start_marker:jpeg_frame_end_market + 2]
            opencv_bytes = opencv_bytes[jpeg_frame_end_market + 2:]
            frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if cv2.waitKey(1) == 27:
                exit(0)
            consecutive_no_image_count = 0
            was_available = True
            yield frame
        else:
            if was_available:
                consecutive_no_image_count = 1
            else:
                consecutive_no_image_count += 1
            if consecutive_no_image_count > no_change_count_threshold:
                print('Consecutive no-image count threshold exceeded')
                break
            was_available = False
