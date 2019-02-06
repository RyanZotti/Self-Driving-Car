import os
import psycopg2
import psycopg2.extras
import re
import subprocess
import tensorflow as tf


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

def connect_to_postgres(host='localhost'):
    connection_string = "host='localhost' dbname='autonomous_vehicle' user='postgres' password='' port=5432"
    connection = psycopg2.connect(connection_string)
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    return connection, cursor


def execute_sql(sql):
    connection, cursor = connect_to_postgres()
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


def get_sql_rows(sql):
    connection, cursor = connect_to_postgres()
    cursor.execute(sql)
    rows = cursor.fetchall()
    cursor.close()
    connection.close()
    return rows