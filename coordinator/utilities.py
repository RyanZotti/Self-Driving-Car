import cv2
import subprocess
from os import listdir
import numpy as np
import os
import psycopg2
import psycopg2.extras
import paramiko
import boto3
from pathlib import Path
import re
import urllib.request
import tensorflow as tf


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
    if os.path.exists(full_path_to_file):
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


def load_model(checkpoint_dir_path):

    # Read the model into memory
    sess = tf.Session()
    start_epoch = get_prev_epoch(checkpoint_dir_path)
    graph_name = 'model-' + str(start_epoch)
    checkpoint_file_path = os.path.join(checkpoint_dir_path, graph_name)
    saver = tf.train.import_meta_graph(checkpoint_dir_path + "/" + graph_name + ".meta")
    saver.restore(sess, checkpoint_file_path)
    graph = tf.get_default_graph()
    x = graph.get_tensor_by_name("x:0")
    # For more details on why .outputs[0] is required, see:
    # https://stackoverflow.com/questions/42595543/tensorflow-eval-restored-graph
    make_logits = graph.get_operation_by_name("logits")
    prediction = make_logits.outputs[0]
    return sess, x, prediction


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
def live_video_stream(ip, port):
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
    count_threshold = 50
    consecutive_no_image_count = 0
    was_available = False
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
            consecutive_no_image_count = 0
            was_available = True
            yield frame
        else:
            if was_available:
                consecutive_no_image_count = 1
            else:
                consecutive_no_image_count += 1
            if consecutive_no_image_count > count_threshold:
                break
            was_available = False

def one_frame_from_stream(ip, port):
    # The `with` closes the stream
    # https://stackoverflow.com/questions/1522636/should-i-call-close-after-urllib-urlopen

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
    count_threshold = 50
    consecutive_no_image_count = 0
    was_available = False
    image = None
    while True:
        if was_available == True:
            break
        opencv_bytes += stream.read(1024)
        a = opencv_bytes.find(b'\xff\xd8')
        b = opencv_bytes.find(b'\xff\xd9')
        if a != -1 and b != -1:
            jpg = opencv_bytes[a:b + 2]
            opencv_bytes = opencv_bytes[b + 2:]
            frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if cv2.waitKey(1) == 27:
                exit(0)
            consecutive_no_image_count = 0
            was_available = True
            image = frame
        else:
            if was_available:
                consecutive_no_image_count = 1
            else:
                consecutive_no_image_count += 1
            if consecutive_no_image_count > count_threshold:
                break
            was_available = False
    stream.close()
    return image


# A single place for all connection related details
# Storing a password in plain text is bad, but this is for a temp db with default credentials
def connect_to_postgres(host='localhost'):
    connection_string = "host='localhost' dbname='autonomous_vehicle' user='postgres' password='' port=5432"
    connection = psycopg2.connect(connection_string)
    cursor = connection.cursor(cursor_factory = psycopg2.extras.RealDictCursor)
    return connection, cursor


def execute_sql(sql):
    connection, cursor = connect_to_postgres()
    cursor.execute(sql)
    connection.commit()
    cursor.close()
    connection.close()


def get_sql_rows(sql):
    connection, cursor = connect_to_postgres()
    cursor.execute(sql)
    rows = cursor.fetchall()
    cursor.close()
    connection.close()
    return rows


def stop_training():
    scripts = [
        'docker rm -f resume-training',
        'docker rm -f model-training'
    ]
    '''
    The .wait() is at the end is required so
    that the Popen commands are required to
    block the function from pregressing until
    the commands have finished. This fixed a
    bug where I would I would run stop_training()
    before running `Docker run ...` that would
    fail because the `Docker run` would execute
    before Docker was able to drop the old
    container
    '''
    for command in scripts:
        process = subprocess.Popen(
            command,
            shell=True,
        ).wait()


def train_new_model(data_path,epochs=10,show_speed='n', save_to_disk='y',image_scale=8,crop_percent=50, s3_bucket='self-driving-car'):
    stop_training()
    # The & is required or Tornado will get stuck
    # TODO: Remove the hardcoded CHECKPOINT_DIRECTORY
    command = '''
        CHECKPOINT_DIRECTORY='/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data' && \
        docker run -i -t -d -p 8091:8091 --rm \
          --network app_network \
          --volume $CHECKPOINT_DIRECTORY:/root/ai/data \
          --name model-training \
          ryanzotti/ai-laptop:latest \
          python /root/ai/microservices/tiny_cropped_angle_model.py \
            --image_scale {image_scale} \
            --angle_only y \
            --crop_percent {crop_percent} \
            --show_speed {show_speed} \
            --s3_sync n \
            --save_to_disk {save_to_disk}
    '''.format(
        data_path=data_path,
        epochs=epochs,
        show_speed=show_speed,
        save_to_disk=save_to_disk,
        image_scale=image_scale,
        crop_percent=crop_percent,
        s3_bucket=s3_bucket
    )
    process = subprocess.Popen(
        command,
        shell=True
    )


def batch_predict(dataset, predictions_port, datasets_port):
    # The & is required or Tornado will get stuck
    # TODO: Remove the hardcoded script path
    # If you use subprocess.Open(..., shell=True) then the
    # subprocess you get back is not useful, it's the process
    # of a short-termed parent, and the PID you care about is
    # not always +1 greater than the parent, so it's not reliable
    # https://stackoverflow.com/questions/7989922/opening-a-process-with-popen-and-getting-the-pid#comment32785237_7989922
    # Using shell=False and passing the arg list works though
    command_list = [
        'python',
        '/Users/ryanzotti/Documents/repos/Self-Driving-Car/coordinator/batch_predict.py',
        '--dataset',
        str(dataset),
        '--predictions_port',
        str(predictions_port),
        '--datasets_port',
        str(datasets_port)
    ]
    process = subprocess.Popen(
        args=command_list,
        shell=False
    )
    return process


def get_datasets_path():
    sql_query = '''
        SELECT
          datasets_parent_path
        FROM raspberry_pi
    '''
    datasets_parent_path = get_sql_rows(sql_query)[0]['datasets_parent_path']
    return datasets_parent_path

def resume_training(
        model_id,
        host_data_path,
        s3_bucket='self-driving-car',
        show_speed='False',
        s3_sync='n',
        epochs=1000,
        save_to_disk='y',
        overfit='n',
        batch_size='50',
        angle_only='y'):

    stop_training()
    sql_query = '''
        SELECT
          models.crop,
          models.scale
        FROM models
        WHERE models.model_id = {model_id}
    '''.format(model_id=model_id)
    model_metadata = get_sql_rows(sql_query)[0]
    # The & is required or Tornado will get stuck
    # TODO: Remove the hardcoded script path
    command = 'docker run -i -t -d -p 8091:8091 \
    --network app_network \
    --volume {host_data_path}:/root/ai/data \
    --name resume-training \
    ryanzotti/ai-laptop:latest \
    python /root/ai/microservices/resume_training.py \
        --datapath /root/ai/data \
        --epochs {epochs} \
        --model_dir /root/ai/data/tf_visual_data/runs/{model_id} \
        --s3_bucket {s3_bucket} \
        --show_speed {show_speed} \
        --s3_sync {s3_sync} \
        --save_to_disk {save_to_disk} \
        --overfit {overfit} \
        --image_scale {image_scale} \
        --crop_percent {crop_percent} \
        --batch_size {batch_size} \
        --angle_only {angle_only}'.format(
        host_data_path=host_data_path,
        epochs=epochs,
        model_id=model_id,
        s3_bucket=s3_bucket,
        show_speed=show_speed,
        s3_sync=s3_sync,
        save_to_disk=save_to_disk,
        overfit=overfit,
        image_scale=model_metadata['scale'],
        crop_percent=model_metadata['crop'],
        batch_size=batch_size,
        angle_only=angle_only
    )
    process = subprocess.Popen(
        command,
        shell=True
    )


def get_pi_connection_details():
    username = None
    hostname = None
    password = None
    sql_query = '''
        SELECT
          username,
          hostname,
          password
        FROM raspberry_pi;
    '''
    rows = get_sql_rows(sql_query)
    if len(rows) > 0:
        first_row = rows[0]
        username = first_row['username']
        hostname = first_row['hostname']
        password = first_row['password']
    return username, hostname, password

# Connects to the Pi and runs a command
def execute_pi_command(command, is_printable=False, return_first_line=False):
    username, hostname, password = get_pi_connection_details()
    ssh = paramiko.SSHClientAsync()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname, username=username, password=password)
    ssh_stdin, ssh_stdout, ssh_stderr = ssh.exec_command(command)
    if is_printable:
        for line in ssh_stderr:
            print(line)
    if return_first_line:
        for index, line in enumerate(ssh_stdout):
            if index == 0:
                ssh.close()
                return line
    ssh.close()


# Paramiko doesn't support this out of the box, which is crazy, so I have to
# create my own class
# https://stackoverflow.com/questions/4409502/directory-transfers-on-paramiko
class RecursiveSFTPClient(paramiko.SFTPClient):
    def put_dir(self, source, target):
        ''' Uploads the contents of the source directory to the target path. The
            target directory needs to exists. All subdirectories in source are
            created under target.
        '''
        for item in os.listdir(source):
            if os.path.isfile(os.path.join(source, item)):
                self.put(os.path.join(source, item), '%s/%s' % (target, item))
            else:
                self.mkdir('%s/%s' % (target, item), ignore_existing=True)
                self.put_dir(os.path.join(source, item), '%s/%s' % (target, item))

    def mkdir(self, path, mode=511, ignore_existing=False):
        ''' Augments mkdir by adding an option to not fail if the folder exists  '''
        try:
            super(RecursiveSFTPClient, self).mkdir(path, mode)
        except IOError:
            if ignore_existing:
                pass
            else:
                raise


def sftp_from_laptop_to_pi(source_path,destination_path):
    username, hostname, password = get_pi_connection_details()
    transport = paramiko.Transport((hostname, 22))
    transport.connect(username=username, password=password)
    sftp = RecursiveSFTPClient.from_transport(transport)
    sftp.mkdir(destination_path, ignore_existing=True)
    sftp.put_dir(source_path, destination_path)
    sftp.close()
