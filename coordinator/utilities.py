import aiopg

import cv2
from datetime import datetime
import subprocess
from os import listdir
import json
import numpy as np
import os
from functools import partial
import psycopg2
import psycopg2.extras
import boto3
from pathlib import Path
import re
import urllib.request
import requests
import tensorflow as tf
import asyncio, asyncssh, sys
import traceback
import warnings
import sys


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


async def shell_command_aio(command, verbose=False):
    process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if verbose:
        if stderr is not None:
            print(stderr)
        if stdout is not None:
            print(stdout)
    return stdout, stderr


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
def connect_to_postgres(host):
    connection_string = "host='{host}' dbname='autonomous_vehicle' user='postgres' password='' port=5432".format(
        host=host
    )
    connection = psycopg2.connect(connection_string)
    cursor = connection.cursor(cursor_factory = psycopg2.extras.RealDictCursor)
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


async def execute_sql_aio(host, sql, aiopg_pool=None):
    if aiopg_pool is None:
        connection_string = f"host='{host}' dbname='autonomous_vehicle' user='postgres' password='' port=5432"
        aiopg_pool = await aiopg.create_pool(connection_string)
    async with aiopg_pool.acquire() as connection:
        async with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            await cursor.execute(sql)
        cursor.close()


async def get_sql_rows_aio(host, sql, aiopg_pool=None):
    if aiopg_pool is None:
        connection_string = f"host='{host}' dbname='autonomous_vehicle' user='postgres' password='' port=5432"
        aiopg_pool = await aiopg.create_pool(connection_string)
    rows = []
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        async with aiopg_pool.acquire() as connection:
            async with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                await cursor.execute(sql)
                async for row in cursor:
                    rows.append(row)
            cursor.close()
        return rows


async def read_pi_setting_aio(host, field_name, aiopg_pool=None):
    sql_query = f'''
        SELECT
          field_value
        FROM pi_settings
        WHERE LOWER(field_name) LIKE LOWER('%{field_name}%')
        ORDER BY event_ts DESC
        LIMIT 1;
    '''
    rows = await get_sql_rows_aio(host=host, sql=sql_query, aiopg_pool=aiopg_pool)
    if len(rows) > 0:
        return rows[0]['field_value']


async def read_toggle_aio(postgres_host, web_page, name, detail, aiopg_pool=None):
    sql_query = f'''
        SELECT
          is_on
        FROM toggles
        WHERE LOWER(web_page) LIKE '%{web_page}%'
          AND LOWER(name) LIKE '%{name}%'
          AND LOWER(detail) LIKE '%{detail}%'
        ORDER BY event_ts DESC
        LIMIT 1;
    '''
    rows = await get_sql_rows_aio(
        host=postgres_host,
        sql=sql_query,
        aiopg_pool=aiopg_pool
    )
    if len(rows) > 0:
        first_row = rows[0]
        is_on = first_row['is_on']
        return is_on
    else:
        return False


async def get_last_service_event(postgres_host, service_host, service, aiopg_pool=None):
    """
    Get the last run attempt. Note that this doesn't track run attempts,
    which look like `docker rm -f {service}; docker run ...`
    """
    query = f"""
    SELECT
        event_time,
        event
    FROM service_event
    WHERE 
        (LOWER(event) = 'start' OR LOWER(event) = 'stop')
        AND LOWER(service) = LOWER('{service}')
        AND LOWER(host) = LOWER('{service_host}')
    ORDER BY event_time DESC
    LIMIT 1
    """
    rows = await get_sql_rows_aio(
        host=postgres_host, sql=query,
        aiopg_pool=aiopg_pool
    )
    if len(rows) > 0:
        now = datetime.utcnow()
        row = rows[0]
        event_time = row['event_time']
        event_age_seconds = (now - event_time).total_seconds()
        event = {
            'type': row['event'],
            'age': event_age_seconds
        }
        return event
    else:
        return None


async def get_recent_health_checks(postgres_host, service_host, service, attempts=3, fresh_threshold_seconds=15.0, aiopg_pool=None):
    """
    Returns the results of the most recent health check API calls
    from the database

    Parameters
    ----------
    postgres_host: str
        Where to connect to Postgres
    service_host: str
        Where the service is running, e.g., "localhost"
    service : str
        The name of the service, e.g., "video"
    attempts: int
        The number of health checks to return. You won't always
        get this number if either your service hasn't been on
        long enough or if the health checks you do have are too
        old. So treat this as a maximum
    fresh_threshold_seconds: float
        The oldest allowable health check result. Any health
        check older than this amount will be excluded

    Returns
    -------
    health_check_stats: dict
        Aggregate outcome of the checks. If you requested the 3 most
        recent checks (and the DB had 3 recent checks), but only
        two of them were healthy, you would get a result like: {
            "total": 3,
            "healthy": 2
        }
    """
    query = f"""
    SELECT
        is_healthy
    FROM service_health
    WHERE 
        LOWER(service) = LOWER('{service}')
        AND LOWER(host) = LOWER('{service_host}')
        AND EXTRACT(SECONDS FROM (NOW() - start_time)) > {fresh_threshold_seconds}
    ORDER BY start_time DESC
    LIMIT {attempts}
    """
    rows = await get_sql_rows_aio(
        host=postgres_host, sql=query, aiopg_pool=aiopg_pool
    )
    if len(rows) > 0:
        healthy_total = 0
        for i, row in enumerate(rows):
            if row['is_healthy']:
                healthy_total += 1
        health_check_stats = {
            'total': len(rows),
            'healthy': healthy_total
        }
        return health_check_stats
    else:
        return {
            'total':0,
            'healthy':0
        }


async def get_is_model_deployable(device, aiopg_pool):

    """
    Both models (Pi driver and laptop dataset reviewer) should be marked
    as not deployable if there isn't a model. Other types of services are
    simpler to work with because all you need to check is their toggle
    status, but with models you must also check whether the model exists,
    and that's what this function is for. This function doesn't actually
    return which model /should/ be deployed, since that's taken care of
    in the model deployment related functions elsewhere. All this function
    checks is whether it would be possible to deploy a model service is
    its toggle were on

    Parameters
    ----------
    device: str
        Either 'pi' or 'laptop', which indicates whether this model is
        to be used for the driving the Pi or the laptop dataset reviewer
    aiopg_pool: object
        Asyncio Postgres connection pool

    Returns
    -------
    is_deployable: boolean
        Whether you could do a deployment if you wanted to
    """

    sql_query = f"""
            SELECT
              deployments.model_id,
              deployments.epoch_id,
              models.scale,
              models.crop
            FROM deployments
            JOIN models
              ON deployments.model_id = models.model_id
            WHERE LOWER(device) LIKE LOWER('%{device}%')
            ORDER BY event_ts DESC
            LIMIT 1;
        """
    rows = await get_sql_rows_aio(
        host=None,
        sql=sql_query,
        aiopg_pool=aiopg_pool
    )
    if len(rows) > 0:
        return True
    else:
        return False


async def get_service_status(postgres_host, service_host, service, aiopg_pool):
    """
    This is used by both the API to populate the colors in the UI
    and also by the scheduler to restart dead services that should
    be on

    Statuses:
    - ready-to-start
    - starting-up
    - healthy
    - unhealthy
    - ready-to-shut-down
    - shutting-down
    - off
    - invincible-zombie
    - invalid-status

    """

    """
    Run this query if you want to see how long it takes to
    get the first positive health check from each service
    after the first initial Docker run command

    SELECT
        service_event.service,
        service_event.event_time,
        EXTRACT(
            SECONDS FROM MIN(service_health.end_time) - service_event.event_time
        ) AS seconds
    FROM service_event
    JOIN service_health
        ON service_event.service = service_health.service
        AND service_health.start_time > service_event.event_time
    WHERE
        service_event.event = 'start'
        AND service_health.is_healthy = TRUE
    GROUP BY
        service_event.service,
        service_event.event_time
    """

    """
    All functions abide by the service host except the laptop
    review dataset model, which will always be localhost. If
    you don't set this to localhost for the review laptop model,
    something upstream of this function will mark the service_host
    as whatever is in the DB, which is the Pi's hostname if you're
    not running a local test. Since the Docker starting service
    lookup script uses service_host in the filter in its SQL query,
    if you don't make this hardcoded change it will look like the
    laptop review model service never got initialized, and so it'll
    get restarted in a loop and will never fully come online
    """
    if service == 'angle-model-laptop':
        service_host = 'localhost'

    # Constants
    startup_grace_period_seconds = 30
    if service == 'angle-model-pi':
        # The model on the Pi takes a really long time to turn on
        startup_grace_period_seconds = 60
    stop_grace_period_seconds = 30.0
    health_check_attempts = 3

    """
    Says whether a service /should/ be on, not to be confused
    with whether the service is /actually/ on
    """
    is_service_toggled_on_awaitable = read_toggle_aio(
        postgres_host=postgres_host,
        web_page='raspberry pi',
        name='service',
        detail=service,
        aiopg_pool=aiopg_pool
    )

    """
    Get the most recent attempt to start or stop the service, which
    could be never or a long time ago
    """
    docker_event_awaitable = get_last_service_event(
        postgres_host=postgres_host,
        service_host=service_host,
        service=service,
        aiopg_pool=aiopg_pool
    )

    health_checks_awaitable = get_recent_health_checks(
        postgres_host=postgres_host,
        service_host=service_host,
        service=service,
        attempts=health_check_attempts,
        fresh_threshold_seconds=15.0,
        aiopg_pool=aiopg_pool
    )

    # Wait for all of the checks to run concurrently
    results = await asyncio.gather(
        is_service_toggled_on_awaitable,
        docker_event_awaitable,
        health_checks_awaitable
    )
    is_service_toggled_on = results[0]
    docker_event = results[1]
    health_checks = results[2]

    """
    For most services it's simple enough to say that if the toggle
    is set to `on` for that service that the service should be on,
    but for model related services you also need a model. I don't
    want to conflate toggles with being deployable, so I made
    separate variables.
    
    The default assumption however is that the service is not for
    a model, so `should_service_be_on` defaults to `is_service_toggled_on`
    """
    should_service_be_on = is_service_toggled_on

    if service == 'angle-model-laptop':
        """
        You should always want the dataset reviewing model to
        be on assuming you have a model that could be deployed
        """
        is_model_deployable = await get_is_model_deployable(
            device='laptop', aiopg_pool=aiopg_pool
        )
        should_service_be_on = is_model_deployable

    if service == 'angle-model-pi':
        """
        You should try to deploy the Pi model if the service is toggled
        on and if there is a model to deploy
        """
        is_model_deployable = await get_is_model_deployable(
            device='pi', aiopg_pool=aiopg_pool
        )
        if is_service_toggled_on and is_model_deployable:
            should_service_be_on = True
        else:
            should_service_be_on = False

    if should_service_be_on:
        if docker_event:
            event_type = docker_event['type']
            if event_type.lower() == 'start':
                if health_checks['total'] >= health_check_attempts:
                    min_healthy = int(health_check_attempts / 2) + 1
                    healthy = health_checks['healthy']
                    if healthy >= min_healthy:
                        """
                        This should be the most common occurrence. You ran the Docker
                        run command already, and the service has been up, possibly for
                        awhile
                        """
                        return 'healthy'
                    else:
                        age_seconds = docker_event['age']
                        if age_seconds > startup_grace_period_seconds:
                            print(f"The {service} service hasn't passed enough health checks and is past the startup grace period")
                            """
                            I want to minimize this as much as possible, but it's important
                            to be alerted when it occurs. Occurs when you ran the Docker
                            command a long time ago, and somehow the service has never started
                            or stopped responding, either because of heavy load or a bug
                            """
                            return 'unhealthy'
                        else:
                            """
                            Occurs when the service is toggled on, you've already called
                            the `docker run` command, but you haven't allowed enough time
                            to know if the health checks have passed
                            """
                            return 'starting-up'
                else:
                    """
                    The service is toggled on, you already called the `docker run` command
                    but you haven't allowed enough time for all the health checks to complete
                    """
                    age_seconds = docker_event['age']
                    if age_seconds < startup_grace_period_seconds:
                        """
                        This is pretty common. This occurs when the service is toggled on,
                        you recently called the `docker run` command, but you haven't been
                        able to run enough health checks yet
                        """
                        return 'starting-up'
                    else:
                        print(f"Your grace period of {startup_grace_period_seconds} seconds for {service} isn't long enough to run all the health checks!")
                        return 'invalid-status'
            elif event_type.lower() == 'stop':
                """
                Occurs when you toggled start-stop-start in quick succession
                and you haven't called the `docker run` command yet 
                """
                return 'ready-to-start'
            else:
                print('Unexpected status!')
                return 'invalid-status'
        else:
            """
            Occurs when you first turn on the car or service
            and you haven't called the `docker run` command yet 
            """
            return 'ready-to-start'
    else:
        if health_checks['healthy'] == 0:
            return 'off'
        else:
            """
            Occurs when the service is still alive even though it's
            toggled off
            """
            if docker_event:
                age_seconds = docker_event['age']
                event_type = docker_event['type']
                if event_type.lower() == 'stop':
                    if age_seconds < stop_grace_period_seconds:
                        """
                        This should be one of the most common shut-down occurrences
                        because it means the service was recently on, you called the
                        `docker rm -f` command and you're still and the service is
                        taking a reasonable amount of time to turn off
                        """
                        return 'shutting-down'
                    else:
                        """
                        Hopefully this should never occur
                        """
                        print(f"Unable to shut down {service}. You're probably not able to track failed heath checks frequently enough within the shutdown grace period of {stop_grace_period_seconds} seconds")
                        return 'invincible-zombie'
                elif event_type.lower() == 'start':
                    """
                    Occurs when the service is up, but is toggled to get shut down
                    and you haven't called the `docker rm -f` command yet
                    """
                    return 'ready-to-shut-down'
                else:
                    print('Unexpected status!')
                    return 'invalid-status'
            else:
                """
                Occurs when the service is up, but is toggled to get shut down
                and you've never called the `docker rm -f` command
                """
                return 'ready-to-shut-down'


async def stop_service_if_ready(
        postgres_host, service_host, stop_on_pi, service, pi_username, pi_hostname, pi_password, aiopg_pool
    ):

    status = await get_service_status(
        postgres_host=postgres_host,
        service_host=service_host,
        service=service,
        aiopg_pool=aiopg_pool
    )

    if status in ['ready-to-shut-down', 'invincible-zombie']:
        command = "docker rm -f {service}".format(service=service)
        if stop_on_pi:
            # Ignore exceptions due to Docker not finding an image
            try:
                await execute_pi_command_aio(
                    command=command,
                    username=pi_username,
                    hostname=pi_hostname,
                    password=pi_password
                )
            except:
                pass
        else:
            await shell_command_aio(command=command)

        """
        I record when I start and stop so that I can check if I recently start
        or stopped the service. Hopefully this will make the services more
        stable, and allows me to decouple the healthcheck interval from the
        service restart interval, since some services take awhile to start up
        """
        service_event_sql = '''
            INSERT INTO service_event(
                event_time,
                service,
                event,
                host
            )
            VALUES (
                NOW(),
                '{service}',
                'stop',
                '{host}'
            )
        '''
        await execute_sql_aio(host=postgres_host, sql=service_event_sql.format(
            service=service,
            host=service_host,
            aiopg_pool=aiopg_pool
        ))


async def start_model_service(
    pi_hostname, pi_username, pi_password, host_port,
    device, session_id, aiopg_pool, is_local_test=False
):
    """
    Used to start a model on container on the Pi (or laptop
    if this is a local test) or on the laptop if the model
    is to be used for dataset reviews, which are compute
    intensive and not great for the Pi's very weak CPU

    Parameters
    ----------
    pi_hostname: str
        The Pi's hostname
    pi_username: str
        The Pi's username
    pi_password: str
        The Pi's password
    host_port: int
        Port of the model service and also of the Docker host
        (they're treated the same)
    device: str
        Indicates where the model should be run before considering
        whether you're running a test. Valid values are 'pi' or
        'laptop'. If you pick 'pi' and is_local_test evaluates to
        True, then I'll run the model on the laptop but give the
        container a different name so as not to confuse it with the
        laptop model container, which is used to generate predictions
        for review datasets, etc
    session_id: uuid4
        ID generated by the editor.py script that is used to clean
        out the jobs table from previous server runs
    aiopg_pool: object
        Asynchronous Postgres connection pool to avoid CPU-heavy
        connections everytime you run a query
    is_local_test: boolean
        Used with the `device` variable to check whether I should
        run a model intended for the Pi on the laptop. I want to
        avoid name container name collisions during local tests
        because that could lead to docker run commands that interfere
        with each other, causing instability and containers that keep
        getting killed
    """

    service = f'angle-model-{device}'

    """
    I want to make this its own function so that I can call it
    from the services page or from the ML page
    """

    sql_query = f"""
        SELECT
          deployments.model_id,
          deployments.epoch_id,
          models.scale,
          models.crop
        FROM deployments
        JOIN models
          ON deployments.model_id = models.model_id
        WHERE LOWER(device) LIKE LOWER('%{device}%')
        ORDER BY event_ts DESC
        LIMIT 1;
    """
    rows = await get_sql_rows_aio(
        host=None,
        sql=sql_query,
        aiopg_pool=aiopg_pool
    )
    first_row = rows[0]
    model_id = first_row['model_id']
    epoch_id = first_row['epoch_id']
    scale = first_row['scale']
    crop_percent = first_row['crop']

    base_model_directory_laptop = await read_pi_setting_aio(
        host=None,
        field_name='models_location_laptop',
        aiopg_pool=aiopg_pool
    )

    if device.lower() == 'laptop' or (device.lower() == 'pi' and is_local_test is True):
        """
        Avoid name collisions between the two separate model containers
        when running local tests. During a local test you'll run the Pi
        container on the laptop and also the dataset reviewer container
        """
        image_name = 'ryanzotti/ai-laptop:latest'
        if is_local_test:
            # There is an emulator that lets you run Pi/ARM images on your laptop
            image_name = 'ryanzotti/ai-pi-python3-7-buster:latest'

        # Kill any currently running model API
        try:
            await shell_command_aio(f'docker rm -f {service}')
        except:
            # Most likely means API is not up
            pass  # This will happen frequently and it's ok, so ignore

        # Run the command to start
        command = f'''
        docker run -i -t -d -p {host_port}:{host_port} \
            --volume {base_model_directory_laptop}:/root/model \
            --name {service} \
            --network app_network \
            {image_name} \
            python /root/ai/microservices/predict.py \
                --port {host_port} \
                --image_scale {scale} \
                --model_base_directory /root/model \
                --angle_only y \
                --crop_percent {crop_percent} \
                --model_id {model_id} \
                --epoch {epoch_id}
        '''
        await shell_command_aio(command)
    elif device.lower() == 'pi' and is_local_test is False:
        model_base_directory_pi = await read_pi_setting_aio(
            host=None,
            field_name='models_location_pi',
            aiopg_pool=aiopg_pool
        )
        from_path = '{model_base_directory}/{model_id}'.format(
            model_base_directory=base_model_directory_laptop,
            model_id=model_id,
        )
        to_path = '{model_base_directory}'.format(
            model_base_directory=model_base_directory_pi
        )

        # Add to jobs table for tracking
        await add_job_aio(
            aiopg_pool=aiopg_pool,
            session_id=session_id,
            name='model transfer',
            detail='Model ID: {model_id}'.format(model_id=model_id),
            status='pending'
        )

        # Ensure the destination exists on the Pi or SFTP will fail
        stdout = await execute_pi_command_aio(
            command='mkdir -p {to_path}'.format(to_path=to_path),
            is_printable=False,
            username=pi_username, hostname=pi_hostname, password=pi_password
        )

        # Run the SFTP step
        try:
            await sftp_aio(
                hostname=pi_hostname,
                username=pi_username,
                password=pi_password,
                localpath=from_path,
                remotepath=to_path,
                sftp_type='put'
            )
        except:
            print('Unable to SFTP the model {from_path} to {to_path}'.format(
                from_path=from_path,
                to_path=to_path
            ))
            traceback.print_exc()
        finally:
            # Remove the job from the jobs table, which signifies completion
            await delete_job_aio(
                aiopg_pool=aiopg_pool,
                job_name='model transfer',
                job_detail='Model ID: {model_id}'.format(model_id=model_id)
            )

        try:
            stdout = await execute_pi_command_aio(
                command=f'docker rm -f {service}',
                is_printable=False,
                username=pi_username,
                hostname=pi_hostname,
                password=pi_password
            )
        except:
            pass  # Ignore the exception if the container doesn't exist

        command = f'''
        docker run -i -t -d -p {host_port}:{host_port} \
            --volume {model_base_directory_pi}:/root/ai/models \
            --name {service} \
            --net=host \
            ryanzotti/ai-pi-python3-7-buster:latest \
            python3 /root/ai/microservices/predict.py \
                --port {host_port} \
                --image_scale {scale} \
                --model_base_directory /root/ai/models \
                --angle_only 'y' \
                --crop_percent {crop_percent} \
                --model_id {model_id} \
                --epoch {epoch_id}
        '''
        await execute_pi_command_aio(
            command=command,
            username=pi_username,
            hostname=pi_hostname,
            password=pi_password,
            is_printable=True
        )
    else:
        print('Invalid model setup inside of start_model_service()!')

    """
    I record when I start and stop so that I can check if I recently start
    or stopped the service. Hopefully this will make the services more
    stable, and allows me to decouple the healthcheck interval from the
    service restart interval, since some services take awhile to start up
    """


async def start_service_if_ready(
    postgres_host, run_on_pi, service_host, service, pi_username, pi_hostname,
    pi_password, session_id, aiopg_pool
):

    """
    This is used to start the service, but only if it should be started
    but hasn't. I start the services from two places: 1) the API when someone
    changes the service toggle and 2) from background jobs that maintain
    the desired state of each service. I want to avoid calling start or stop
    commands in quick succession unnecessarily
    """
    status = await get_service_status(
        postgres_host=postgres_host,
        service_host=service_host,
        service=service,
        aiopg_pool=aiopg_pool
    )

    if status.lower() in ['ready-to-start', 'unhealthy']:
        """
        The benefit of saving all of the Docker commands as code is that
        I will no longer need to update a bunch of documentation references
        when I have to change something. Also, it's a major pain starting
        up each of these manually.

        The Docker networking settings are not consistent across operating
        systems. On the Pi, which runs Linux, I need net=host or the
        bluetooth capability won't work for the PS3 controller. However,
        the net=host capability leads to container to container issues
        when I run on the Mac.
        """
        operating_system_config = {
            'mac': {
                'network': '--network car_network -p {port}:{port}',
            },
            'linux': {
                'network': '--net=host',
            }
        }

        # TODO: Figure out how to support Windows
        if run_on_pi:
            operating_system = 'linux'
        else:
            operating_system = 'mac'

        if not run_on_pi:
            """
            Make sure the Docker network exists on the laptop
            before attempting to create Docker containers. The
            containers will fail if the network doesn't exist.
            The 2>/dev/null ignores standard error, since
            Docker complains if the network already exists
            """
            command = 'docker network create car_network 2>/dev/null'
            _ = await shell_command_aio(
                command=command
            )
        if service == 'record-tracker':
            port = 8093
            network = operating_system_config[operating_system]['network'].format(port=port)
            if run_on_pi:
                dataset_base_directory = await read_pi_setting_aio(
                    host=postgres_host, field_name='pi datasets directory', aiopg_pool=aiopg_pool
                )
                await execute_pi_command_aio(
                    command='mkdir -p ~/vehicle-datasets; docker rm -f {service}; docker run -t -d -i {network} --name {service} --volume {directory}:/home/pi/vehicle-datasets ryanzotti/record-tracker:latest python3 /root/server.py --port {port} --directory /home/pi/vehicle-datasets'.format(
                        service=service,
                        network=network,
                        port=port,
                        directory=dataset_base_directory
                    ),
                    username=pi_username,
                    hostname=pi_hostname,
                    password=pi_password
                )
            else:
                await shell_command_aio(
                    command='mkdir -p ~/vehicle-datasets; docker rm -f {service}; docker run -t -d -i {network} --name {service} --volume ~/vehicle-datasets:/home/pi/vehicle-datasets ryanzotti/record-tracker:latest python3 /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'video':
            port = 8091
            network = operating_system_config[operating_system]['network'].format(port=port)
            if run_on_pi:
                await execute_pi_command_aio(
                    command='docker rm -f {service}; docker run -t -d -i --device=/dev/video0 {network} --name {service} ryanzotti/ffmpeg:latest'.format(
                        service=service,
                        network=network
                    ),
                    username=pi_username,
                    hostname=pi_hostname,
                    password=pi_password
                )
            else:
                await shell_command_aio(
                    command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/ffmpeg:latest python3 /root/tests/fake_server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'control-loop':
            port = 8887
            network = operating_system_config[operating_system]['network'].format(port=port)
            if run_on_pi:
                await execute_pi_command_aio(
                    command='docker rm -f {service}; docker run -i -t -d {network} --name {service} ryanzotti/control_loop:latest python3 /root/car/start.py --port {port} --localhost'.format(
                        service=service,
                        network=network,
                        port=port
                    ),
                    username=pi_username,
                    hostname=pi_hostname,
                    password=pi_password
                )
            else:
                await shell_command_aio(
                    command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/control_loop:latest python3 /root/car/start.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'user-input':
            port = 8884
            network = operating_system_config[operating_system]['network'].format(port=port)
            if run_on_pi:
                await execute_pi_command_aio(
                    command='docker rm -f {service}; docker run -i -t {network} --name {service} --privileged -d ryanzotti/user_input:latest python3 /root/server.py --port 8884'.format(
                        service=service,
                        network=network,
                        port=port
                    ),
                    username=pi_username,
                    hostname=pi_hostname,
                    password=pi_password
                )
            else:
                await shell_command_aio(
                    command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/user_input:latest python3 /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'engine':
            port = 8092
            network = operating_system_config[operating_system]['network'].format(port=port)
            if run_on_pi:
                await execute_pi_command_aio(
                    command='docker rm -f {service}; docker run -t -d -i --privileged {network} --name {service} ryanzotti/vehicle-engine:latest'.format(
                        service=service,
                        network=network
                    ),
                    username=pi_username,
                    hostname=pi_hostname,
                    password=pi_password
                )
            else:
                await shell_command_aio(
                    command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/vehicle-engine:latest python3 /root/tests/fake_server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'ps3-controller':
            port = 8094
            network = operating_system_config[operating_system]['network'].format(port=port)
            if run_on_pi:
                await execute_pi_command_aio(
                    command='docker rm -f {service}; docker run -i -t -d --name {service} {network} --volume /dev/bus/usb:/dev/bus/usb --volume /run/dbus:/run/dbus --volume /var/run/dbus:/var/run/dbus --volume /dev/input:/dev/input --privileged ryanzotti/ps3_controller:latest python /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    ),
                    username=pi_username,
                    hostname=pi_hostname,
                    password=pi_password
                )
            else:
                await shell_command_aio(
                    command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/ps3_controller:latest python /root/tests/fake_server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'memory':
            port = 8095
            network = operating_system_config[operating_system]['network'].format(port=port)
            if run_on_pi:
                await execute_pi_command_aio(
                    command=
                    'docker rm -f {service}; docker run -i -t -d --name {service} {network} ryanzotti/vehicle-memory:latest python /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    ),
                    username=pi_username,
                    hostname=pi_hostname,
                    password=pi_password
                )
            else:
                await shell_command_aio(
                    command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/vehicle-memory:latest python /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'angle-model-pi':
            """
            Used to drive the car. This could also be the laptop if you're
            running local tests. The `start_model_service` function reads the
            `run_on_pi` variable to know whether to deploy to the Pi or laptop.
            It's possible to have two identical models running on the laptop
            during local unit tets: one for the Pi the other for the laptop
            dataset reviewer.
            """
            is_local_test = not run_on_pi
            await start_model_service(
                pi_hostname=pi_hostname,
                pi_username=pi_username,
                pi_password=pi_password,
                host_port=8885,
                device='pi',
                session_id=session_id,
                aiopg_pool=aiopg_pool,
                is_local_test=is_local_test
            )
        elif service == 'angle-model-laptop':
            """
            This is the model container that is used to review datasets
            """
            await start_model_service(
                pi_hostname=pi_hostname,
                pi_username=pi_username,
                pi_password=pi_password,
                host_port=8886,
                device='laptop',
                session_id=session_id,
                aiopg_pool=aiopg_pool,
                is_local_test=False
            )

        if service == 'angle-model-laptop':
            service_host = 'localhost'
        elif service == 'angle-model-pi':
            if not run_on_pi is True:
                service_host = 'localhost'

        """
        I record when I start and stop so that I can check if I recently start
        or stopped the service. Hopefully this will make the services more
        stable, and allows me to decouple the healthcheck interval from the
        service restart interval, since some services take awhile to start up
        """
        service_event_sql = '''
            INSERT INTO service_event(
                event_time,
                service,
                event,
                host
            )
            VALUES (
                NOW(),
                '{service}',
                'start',
                '{host}'
            )
        '''
        await execute_sql_aio(host=postgres_host, sql=service_event_sql.format(
            service=service,
            host=service_host
        ))
    else:
        return


def read_pi_setting(host, field_name, postgres_pool=None):

    if postgres_pool:
        connection = postgres_pool.getconn()
        cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        sql = """
            SELECT
              field_value
            FROM pi_settings
            WHERE LOWER(field_name) LIKE LOWER('%{field_name}%')
            ORDER BY event_ts DESC
            LIMIT 1;
        """.format(
            field_name=field_name
        )
        cursor.execute(sql)
        rows = cursor.fetchall()
        cursor.close()
        # Use this method to release the connection object and send back to the connection pool
        postgres_pool.putconn(connection)
        if len(rows) > 0:
            return rows[0]['field_value']
    else:
        connection, cursor = connect_to_postgres(host=host)
        cursor.execute(
            """
            SELECT
              field_value
            FROM pi_settings
            WHERE LOWER(field_name) LIKE LOWER('%{field_name}%')
            ORDER BY event_ts DESC
            LIMIT 1;
            """.format(
                field_name=field_name
            )
        )
        rows = cursor.fetchall()
        cursor.close()
        connection.close()
        if len(rows) > 0:
            return rows[0]['field_value']

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

async def stop_training_aio():
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
        await shell_command_aio(command, verbose=False)


def train_new_model(
    data_path, postgres_host, port, model_base_directory, epochs=10, image_scale=8,
    crop_percent=50, s3_bucket='self-driving-car'
):
    """
    Eventually the editor.py script, which uses this function will
    also run in a Docker container, and when that happens both will
    use the same hostname to refer to Postgres. For now though the
    editor.py has to use localhost and the Docker container that
    performs training has to refer to Postgres by its container name,
    postgres-11-1
    """
    docker_postgres_host = 'postgres-11-1'

    stop_training()
    """
    If you want to see why a Docker container failed, remove the --rm
    from the command below and from the command line execute:

        docker logs <container ID>

    The --rm option removes the container once it stops, and probably
    saves a lot of disk space long-term, so it's best to keep it on
    except for cases where you need to debug. Nonetheless, you won't
    see the container ID with `docker ps -a` if the --rm option is used
    """
    command = '''
        docker run -i -t -d -p {port}:{port} \
          --network car_network \
          --volume '{data_path}':/root/ai/data \
          --volume {model_base_directory}:/root/ai/model \
          --name model-training \
          ryanzotti/ai-laptop:latest \
          python /root/ai/microservices/train_new_model.py \
            --postgres-host {postgres_host} \
            --image_scale {image_scale} \
            --angle_only y \
            --crop_percent {crop_percent} \
            --port {port} \
            --model-base-directory /root/ai/model
    '''.format(
        data_path=data_path,
        postgres_host=docker_postgres_host,
        epochs=epochs,
        image_scale=image_scale,
        crop_percent=crop_percent,
        s3_bucket=s3_bucket,
        model_base_directory=model_base_directory,
        port=port
    )
    print(command)
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

def resume_training(
        model_id,
        host_data_path,
        model_base_directory,
        postgres_host,
        port,
        epochs=1000,
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
    model_metadata = get_sql_rows(
        host=postgres_host,
        sql=sql_query
    )[0]

    # TODO: Consolidate docker_postgres_host and postgres_host once editor.py is containerized
    """
    Eventually the editor.py script, which uses this function will
    also run in a Docker container, and when that happens both will
    use the same hostname to refer to Postgres. For now though the
    editor.py has to use localhost and the Docker container that
    performs training has to refer to Postgres by its container name,
    postgres-11-1
    """
    docker_postgres_host = 'postgres-11-1'

    """
    The hardcoded script path is ok because it will always be
    in the same place in Docker
    """
    command = 'docker run -i -t -d -p {port}:{port} \
    --network car_network \
    --volume {host_data_path}:/root/ai/data \
    --volume {model_base_directory}:/root/ai/model \
    --name resume-training \
    ryanzotti/ai-laptop:latest \
    python /root/ai/microservices/resume_training.py \
        --data-path /root/ai/data \
        --postgres-host {postgres_host} \
        --epochs {epochs} \
        --model-base-directory /root/ai/model \
        --port {port} \
        --overfit {overfit} \
        --image_scale {image_scale} \
        --crop_percent {crop_percent} \
        --model_id {model_id} \
        --batch_size {batch_size} \
        --angle_only {angle_only}'.format(
        host_data_path=host_data_path,
        model_base_directory=model_base_directory,
        postgres_host=docker_postgres_host,
        epochs=epochs,
        model_id=model_id,
        overfit=overfit,
        image_scale=model_metadata['scale'],
        crop_percent=model_metadata['crop'],
        batch_size=batch_size,
        angle_only=angle_only,
        port=port
    )
    process = subprocess.Popen(
        command,
        shell=True
    )


def get_pi_connection_details(postgres_host):
    username = read_pi_setting(host=postgres_host, field_name='username')
    hostname = read_pi_setting(host=postgres_host, field_name='hostname')
    password = read_pi_setting(host=postgres_host, field_name='password')
    return username, hostname, password

# Connects to the Pi and runs a command
def execute_pi_command(command, postgres_host, is_printable=False, pi_credentials=None):
    if pi_credentials:
        username = pi_credentials['username']
        hostname = pi_credentials['hostname']
        password = pi_credentials['password']
    else:
        username, hostname, password = get_pi_connection_details(
            postgres_host=postgres_host
        )
    async def run_client():
        async with asyncssh.connect(hostname, username=username, password=password) as conn:
            result = await conn.run(command, check=True)
            if is_printable:
                print(result.stdout, end='')
            return result.stdout
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(run_client())
        return result
    except (OSError, asyncssh.Error) as exc:
        pass


async def execute_pi_command_aio(command, username, hostname, password, is_printable=False):
    try:
        async with asyncssh.connect(hostname, username=username, password=password) as conn:
            result = await conn.run(command, check=True)
            if is_printable:
                print(result.stdout, end='')
            return result.stdout
    except (OSError, asyncssh.Error) as exc:
        if is_printable:
            traceback.print_exc()
            print(f'Failed to run {command}')


def is_pi_healthy(command, postgres_host, is_printable=False, return_first_line=False, pi_credentials=None):
    if pi_credentials:
        username = pi_credentials['username']
        hostname = pi_credentials['hostname']
        password = pi_credentials['password']
    else:
        username, hostname, password = get_pi_connection_details(
            postgres_host=postgres_host
        )
    async def run_client():
        async with asyncssh.connect(hostname, username=username, password=password) as conn:
            result = await conn.run(command, check=True)
            if is_printable:
                print(result.stdout, end='')
    try:
        asyncio.get_event_loop().run_until_complete(run_client())
        return True
    except (OSError, asyncssh.Error) as exc:
        return False


def sftp(hostname, username, password, remotepath, localpath, sftp_type):
    assert sftp_type in ['get', 'put']
    async def run_client():
        async with asyncssh.connect(hostname, username=username, password=password) as conn:
            async with conn.start_sftp_client() as sftp:
                if sftp_type == 'get':
                    await sftp.get(
                        remotepaths=remotepath,
                        localpath=localpath,
                        recurse=True
                    )
                elif sftp_type == 'put':
                    await sftp.put(
                        remotepath=remotepath,
                        localpaths=localpath,
                        recurse=True
                    )
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_client())

    except (OSError, asyncssh.Error) as exc:
        sys.exit('SFTP operation failed: ' + str(exc))


async def sftp_aio(hostname, username, password, remotepath, localpath, sftp_type):
    assert sftp_type in ['get', 'put']
    async def run_client():
        async with asyncssh.connect(hostname, username=username, password=password) as conn:
            async with conn.start_sftp_client() as sftp:
                if sftp_type == 'get':
                    await sftp.get(
                        remotepaths=remotepath,
                        localpath=localpath,
                        recurse=True
                    )
                elif sftp_type == 'put':
                    await sftp.put(
                        remotepath=remotepath,
                        localpaths=localpath,
                        recurse=True
                    )
    try:
        await run_client()
    except (OSError, asyncssh.Error) as exc:
        sys.exit('SFTP operation failed: ' + str(exc))


def get_pi_total_file_count(postgres_host, dataset_name, pi_credentials=None):
    """
    Lists the total number of files on the Pi for a
    given dataset. This is one of several functions
    used to check the progress of the SFTP transfer
    of a dataset from the Pi to the laptop during the
    import process
    """
    pi_datasets_dir = read_pi_setting(
        host=postgres_host,
        field_name='pi datasets directory'
    )
    pi_command = 'ls -ltr {pi_datasets_dir}/{dataset_name} | wc -l'.format(
        pi_datasets_dir=pi_datasets_dir,
        dataset_name=dataset_name
    )
    stdout = execute_pi_command(
        command=pi_command,
        postgres_host=postgres_host,
        is_printable=False,
        pi_credentials=pi_credentials
    )
    file_count = int(stdout.replace('\n',''))
    return file_count


def get_laptop_total_file_count(postgres_host, dataset_name, laptop_datasets_dir=None):
    """
    Lists the total number of files on the Pi for a
    given dataset. The total includes label files +
    image files. This is one of several functions
    used to check the progress of the SFTP transfer
    of a dataset from the Pi to the laptop during the
    import process
    """
    if laptop_datasets_dir is None:
        laptop_datasets_dir = read_pi_setting(
            host=postgres_host,
            field_name='laptop datasets directory'
        )
    full_path = '{laptop_datasets_dir}/{dataset_name}'.format(
        laptop_datasets_dir=laptop_datasets_dir,
        dataset_name=dataset_name
    )
    if os.path.exists(full_path):
        command = 'ls -ltr {laptop_datasets_dir}/{dataset_name} | wc -l'.format(
            laptop_datasets_dir=laptop_datasets_dir,
            dataset_name=dataset_name
        )
        stdout = shell_command(command).strip()
        file_count = int(stdout)
        return file_count
    else:
        return 0


def get_dataset_db_record_count(postgres_host, dataset_name):
    """
    Can be used to tell if an SFTP is complete (if count > 0)
    or can be an input to determine completion percent of a
    DB load. Both of these things are needed to check a
    dataset's import status. This is one of several
    functions used to check the progress of the SFTP transfer
    of a dataset from the Pi to the laptop during the import
    process
    """
    read_sql = '''
        SELECT
          COUNT(*) AS count
        FROM records
        WHERE
          LOWER(dataset) = LOWER('{dataset}')
        '''.format(
        dataset=dataset_name
    )
    rows = get_sql_rows(
        host=postgres_host,
        sql=read_sql
    )
    return rows[0]['count']


def add_job(postgres_host, session_id, name, detail, status, postgres_pool=None):
    """
    Used to check SFTP file transfers from the Pi to the laptop
    during the dataset import process.
    """
    insert_sql = '''
    BEGIN;
    INSERT INTO jobs(
      created_at,
      session_id,
      name,
      detail,
      status
    )
    VALUES (
      NOW(),
      '{session_id}',
      '{name}',
      '{detail}',
      '{status}'
    );
    COMMIT;
    '''.format(
        session_id=session_id,
        name=name,
        detail=detail,
        status=status
    )
    if postgres_pool:
        execute_sql(
            host=None,
            sql=insert_sql,
            postgres_pool=postgres_pool
        )
    else:
        execute_sql(
            host=postgres_host,
            sql=insert_sql
        )

async def add_job_aio(aiopg_pool, session_id, name, detail, status):
    """
    Used to check SFTP file transfers from the Pi to the laptop
    during the dataset import process.
    """
    insert_sql = '''
    INSERT INTO jobs(
      created_at,
      session_id,
      name,
      detail,
      status
    )
    VALUES (
      NOW(),
      '{session_id}',
      '{name}',
      '{detail}',
      '{status}'
    )
    '''.format(
        session_id=session_id,
        name=name,
        detail=detail,
        status=status
    )
    await execute_sql_aio(host=None, sql=insert_sql, aiopg_pool=aiopg_pool)


def get_is_job_availbale(postgres_host, session_id, name, detail):
    """
    Checks if a job is running. This was originally written to
    track SFTP transfers from the Pi to the laptop. Each time
    you run the editor.py script you'll get a new session_id
    variable that you can use to see which jobs in the jobs are
    from the current session
    """
    read_sql = '''
    SELECT
      COUNT(*) AS count
    FROM jobs
    WHERE
      LOWER(name) = LOWER('{name}')
      AND LOWER(detail) = LOWER('{detail}')
      AND LOWER(session_id) = LOWER('{session_id}')
    '''.format(
        session_id=session_id,
        name=name,
        detail=detail
    )
    rows = get_sql_rows(
        host=postgres_host,
        sql=read_sql
    )
    if rows[0]['count'] > 0:
        return True
    else:
        return False


def delete_stale_jobs(postgres_host, session_id):
    """
    I created the jobs table to track the status of
    SFTP jobs during the "import data" process. Each
    time the editor.py script runs I generate a new
    UUID that serves as the session_id. Any rows in
    the job table that do not match this value are
    from past runs and be ignored, which is why this
    function deletes them.
    """

    delete_sql = '''
        DELETE FROM jobs
        WHERE LOWER(session_id) != LOWER('{session_id}')
        '''.format(
        session_id=session_id
    )
    execute_sql(
        host=postgres_host,
        sql=delete_sql
    )


def delete_job(job_name, job_detail, session_id, postgres_pool=None):
    """
    I created the jobs table to track the status of
    SFTP jobs during the "import data" process. Each
    time the editor.py script runs I generate a new
    UUID that serves as the session_id. I should run
    this script if an import has ended, which could
    mean it was a success, it failed,
    """

    delete_sql = f'''
        BEGIN;
        DELETE FROM jobs
        WHERE
            LOWER(name) = LOWER('{job_name}')
            AND LOWER(detail) = LOWER('{job_detail}')
            AND LOWER(session_id) = LOWER('{session_id}');
        COMMIT;
        '''
    execute_sql(
        host=None,
        sql=delete_sql,
        postgres_pool=postgres_pool
    )


async def delete_job_aio(aiopg_pool, job_name, job_detail):
    """
    I created the jobs table to track the status of
    SFTP jobs during the "import data" process. Each
    time the editor.py script runs I generate a new
    UUID that serves as the session_id. I should run
    this script if an import has ended, which could
    mean it was a success, it failed,
    """

    delete_sql = '''
        DELETE FROM jobs
        WHERE
            LOWER(name) = LOWER('{job_name}')
            AND LOWER(detail) = LOWER('{job_detail}')
        '''.format(
        job_name=job_name,
        job_detail=job_detail
    )
    await execute_sql_aio(
        host=None,
        aiopg_pool=aiopg_pool,
        sql=delete_sql
    )


def cache_pi_credentials(postgres_host):
    username, hostname, password = get_pi_connection_details(
        postgres_host=postgres_host
    )
    pi_credentials = {
        'username': username,
        'hostname': hostname,
        'password': password
    }
    return pi_credentials


def dataset_import_percent(db_record_count, is_job_available, laptop_file_count, pi_json_file_count):
    db_record_count = int(db_record_count)
    laptop_file_count = int(laptop_file_count)
    pi_json_file_count = int(pi_json_file_count)

    """
    Used to update the html dataset import rows. Transferring files
    from the Pi to the laptop is not instantaneous. It can take a
    few minutes, so it's helpful to see completion percent to know
    that the transfer is working.
    Possible Results:
    * Not Started: percent < 0
    * In Progress 0 <= percent < 100
    * Done: 100
    """

    if db_record_count > 0:
        """
        If a dataset has any records in the DB and no active jobs
        then assume the dataset is complete. In practice, this could
        mean that an import job failed and the editor.py script was
        restarted, but for code simplicity assume this can't happen.
        If it does, the user can delete the dataset in the "laptop"
        nav section and import it again from the "pi" nav section
        to start the dataset import from scratch. Alternatively, I
        could also compare the number of records in the DB to the
        records on the Pi's file system, but this isn't a good idea
        because 1) I won't always have access to the Pi, and 2) I
        want to be able to delete dirty records on the laptop but
        don't care about cleanup on the Pi
        """
        if is_job_available is False:
            return 100
        else:
            """
            If the dataset has an active job with records in the DB,
            then assume the SFTP step has completed but the DB import
            has not. The DB import doesn't happen until the SFTP
            completes. Completion percent is 50% + DB (DB record count /
            the file json record count) x 50%. Each job is assigned a
            session_id, which corresponds to a unique inovcation of the
            editor.py script. If there is a job in the table whose
            session_id does not match the current editor.py session_id,
            then the job is not actually active.

            There is one DB record for each label file. There are
            roughly twice as many total files as there are label files.
            The ratio isn't exact because there are some metadata
            files and also because the ls command returns some of its
            own metadata, like the number of records, so to get a rough
            sense of the percentage of files loaded to the DB I divide
            the DB files by the half the total Pi files
            """
            approximate_pi_label_files = pi_json_file_count
            return 50 + int((db_record_count / approximate_pi_label_files) * 50)
    else:
        """
        If the dataset has an active job but no records in the DB,
        assume the DB import hasn't started yet and the SFTP part
        is still in progress. However, if the session_id doesn't
        match the session_id in editor.py, then assume that the
        job did not complete and was terminated without cleanup.
        Completion percent is (laptop record
        count / Pi record count) x 50%
        """
        if is_job_available is True:
            return int((laptop_file_count / pi_json_file_count) * 50)
        else:
            """
            If the dataset has no records in the DB and no active job
            then assume that import hasn't started yet
            """
            return -1


def get_pi_dataset_import_stats(
    pi_datasets_dir, laptop_dataset_dir, postgres_host, session_id,
    service_host, record_tracker_port
):

    """
    Used to report JSON file counts from each of the Pi dataset
    directories. I wrote this function because at one point I
    saw really bad performance issues on the Postgres DB because
    I called Postgres a bunch of times for dataset, and I planned
    on having a bunch of datasets over time. Now there should be
    just one call that gets the data for all datasets. These
    results are used to show data on the imports page

    Parameters
    ----------
    pi_datasets_dir : string
        Full path to the datasets directory on the pi. For example:
        /home/pi/vehicle-datasets
    laptop_dataset_dir : string
        Full path to the datasets directory on the Laptop. For
        example: /home/your-name/vehicle-datasets
    postgres_host : string
        Postgres hostname
    session_id: string
        The random uuid assigned to a given run of editor.py. This
        is used to identify active jobs from stale jobs
    service_host: str
        The host of the record-tracker service on the Pi. I use
        this to check if the record-tracker service is up so that
        I don't show live recording datasets. The record-tracker
        service is designed to always point to a dataset while its
        on (and it creates a new dataset when it starts up), so
        I want to avoid a situation where all of the parts get
        turned on, I go to the Pi datasets / import page and see a
        dataset with 0 records and think it's old and delete it,
        only to get an error when I eventually start recording and
        the record-tracker service fails because its folder has
        been removed
    record_tracker_port: int
        The port of the record-tracker service on the Pi. See the
        description of service_host for an explanation of why this
        is needed

    Returns
    ----------
    records : list
        List of dictionaries, where each dictionary represents
        a Pi dataset that could be imported. This is used to
        display results on the Pi import datasets page

        Example: [
            {'id': '5', 'dataset': 'dataset_5_18-10-20', 'date': '2018-10-20', 'count': '1915', 'percent': -1},
            {'id': '3', 'dataset': 'dataset_3_18-10-20', 'date': '2018-10-20', 'count': '1400', 'percent': 100},
            {'id': '4', 'dataset': 'dataset_4_18-10-20', 'date': '2018-10-20', 'count': '1301', 'percent': -1}
        ]
    """

    """
    Get data on all active jobs and record counts in the same
    query to reduce total DB calls
    """
    stats_query = '''
        WITH counts AS (
        SELECT
            dataset,
            count(*) AS total
        FROM records
        GROUP BY dataset)

        SELECT
            CASE WHEN jobs.detail IS NULL
                THEN counts.dataset
                ELSE jobs.detail
            END AS dataset,
            COALESCE(counts.total,-1) AS total,
            CASE WHEN jobs.detail IS NULL
                THEN FALSE
                ELSE TRUE
            END AS is_job_active
        FROM jobs FULL JOIN counts ON jobs.detail = counts.dataset
         AND jobs.session_id = '{session_id}'
         AND jobs.name = 'dataset import'
    '''.format(session_id=session_id)
    rows = get_sql_rows(
        host=postgres_host,
        sql=stats_query
    )
    stats = {}
    for row in rows:
        dataset = row['dataset']
        stats[dataset] = {
            'total':row['total'],
            'is_job_active':row['is_job_active']
        }

    def parse_file_counts(stdout):
        raw_lines = stdout.split('\n')
        records = {}
        for raw_line in raw_lines:
            line = raw_line.strip()
            if 'dataset' in line:
                json_file_count, dataset_name = line.split(' ')
                _, id, date = dataset_name.split('_')
                year, month, day = date.split('-')
                new_date = '20{year}-{month}-{day}'.format(
                    year=year, month=month, day=day
                )
                records[dataset_name] = {
                    'id': id,
                    'date': new_date,
                    'count': json_file_count
                }
        return records

    # Get file counts from multiple directories: https://stackoverflow.com/a/39622947/554481
    command = 'cd {dir}; du -a | grep -i .json | cut -d/ -f2 | sort | uniq -c | sort -nr'

    # Get laptop file stats
    laptop_stdout = subprocess.check_output(
        command.format(dir=laptop_dataset_dir),
        shell=True
    ).decode()
    laptop_metadata = parse_file_counts(
        stdout=laptop_stdout
    )

    # Get Pi file stats
    pi_stdout = execute_pi_command(
        command=command.format(dir=pi_datasets_dir),
        postgres_host=postgres_host
    )
    pi_metadata = parse_file_counts(
        stdout=pi_stdout
    )

    """
    I use this to check if the record-tracker service is up so that
    I don't show live recording datasets. The record-tracker service
    is designed to always point to a dataset while its on (and it
    creates a new dataset when it starts up), so I want to avoid a
    situation where all of the parts get turned on, I go to the Pi
    datasets / import page and see a dataset with 0 records and think
    it's old and delete it, only to get an error when I eventually
    start recording and the record-tracker service fails because its
    folder has been removed.
    """
    live_dataset = ''
    timeout_seconds = 1.0
    endpoint = 'http://{host}:{port}/get-current-dataset-name'.format(
        host=service_host,
        port=record_tracker_port
    )
    try:
        response = requests.get(
            endpoint,
            timeout=timeout_seconds
        )
        if str(response.status_code)[0] == '2':
            live_dataset = json.loads(response.text)['dataset']
    except:
        """
        If the record-tracker service isn't available, then we don't need
        to worry about deleting an actively recorded dataset, so no need
        to remove anything from the datasets list
        """
        pass

    # Join everything together
    records = []
    for dataset_name, metadata in pi_metadata.items():
        if dataset_name == live_dataset:
            continue  # Don't show datasets that could still be written to
        laptop_file_count = 0
        if dataset_name in laptop_metadata:
            laptop_file_count = laptop_metadata[dataset_name]['count']
        db_record_count = 0
        is_job_active = False
        if dataset_name in stats:
            db_record_count = stats[dataset_name]['total']
            is_job_active = stats[dataset_name]['is_job_active']
        pi_json_file_count = pi_metadata[dataset_name]['count']
        percent = dataset_import_percent(
            db_record_count=db_record_count,
            is_job_available=is_job_active,
            laptop_file_count=laptop_file_count,
            pi_json_file_count=pi_json_file_count
        )
        record = {
            'id': pi_metadata[dataset_name]['id'],
            'dataset': dataset_name,
            'date': pi_metadata[dataset_name]['date'],
            'count': pi_json_file_count,
            'percent': percent
        }
        records.append(record)

    """
    By default show dataset records in order of their dataset ID,
    which corresponds to the other that they were created
    """
    records = sorted(records, key = lambda i: i['id'])
    return records
