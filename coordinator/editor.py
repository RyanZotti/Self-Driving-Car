from tornado import gen
import argparse
import cv2
from datetime import datetime
import time
import urllib.request
from ai.record_reader import RecordReader
import os
from os.path import dirname, join
import numpy as np
import tornado.gen
import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver
import requests
import json
import signal
import subprocess
from coordinator.utilities import *
import json
from shutil import rmtree
import traceback
from concurrent.futures import ThreadPoolExecutor
from ai.transformations import pseduo_crop, show_resize_effect


class Home(tornado.web.RequestHandler):
    def get(self):
        self.render("dist/index.html")


class NewDatasetName(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    def get_next_id(self):
        sql_query = '''
            SELECT DISTINCT
              dataset
            FROM records
        '''
        rows = get_sql_rows(sql_query)
        if len(rows) > 0:
            ids = []
            for row in rows:
                id = row['dataset'].split('_')[1]
                id = int(id)
                ids.append(id)
            return max(ids) + 1
        else:
            return 1

    def make_dataset_name(self, id):
        now = datetime.now()
        year = str(now.year)[2:]
        month = str(now.month)
        if len(month) == 1:
            month = '0' + month
        day = str(now.day)
        if len(day) == 1:
            day = '0' + day
        name = 'dataset_{id}_{year}-{month}-{day}'.format(
            id=id,
            year=year,
            month=month,
            day=day
        )
        return name

    @tornado.concurrent.run_on_executor
    def new_dataset_name(self):

        id = self.get_next_id()
        dataset_name = self.make_dataset_name(id)
        return {'name':dataset_name}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.new_dataset_name()
        self.write(result)


class UpdateDriveState(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(200)

    @tornado.concurrent.run_on_executor
    def send_drive_state(self, json_input):
        is_recording = json_input['recording']
        if is_recording == True:
            # TODO: Remove hardcoded port
            image = one_frame_from_stream(
                ip=self.application.pi_host,
                port=8091
            )
            record_id = json_input['record_id']
            angle = json_input['angle']
            throttle = json_input['throttle']
            dataset = json_input['dataset']
            self.application.record_reader.write_new_record(
                dataset_name=dataset,
                record_id=record_id,
                angle=angle,
                throttle=throttle,
                image=image
            )
        # TODO: Send brake, drive-mode details to Pi even if not recording
        seconds = 1
        request = requests.post(
            # TODO: Remove hardcoded port
            'http://{host}:{port}/track-human-requests'.format(
                host=self.application.pi_host,
                port=8884
            ),
            data=json.dumps(json_input),
            timeout=seconds
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.send_drive_state(json_input=json_input)
        self.write(result)


class DeploymentHealth(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_deployment_health(self,json_input):
        device = json_input['device']
        if device.lower() == 'laptop':
            host = 'localhost'
        elif device.lower() == 'pi':
            sql_query = '''
                SELECT
                  hostname,
                  password,
                  username
                FROM raspberry_i
            '''
            first_row = get_sql_rows(sql_query)[0]
            host = first_row['hostname']
        else:
            pass
        seconds = 1
        try:
            request = requests.post(
                # TODO: Remove hardcoded port
                'http://{host}:8885/model-metadata'.format(host=host),
                timeout=seconds
            )
            response = json.loads(request.text)
            response['is_alive'] = True
            return response
        except:
            return {'is_alive': False}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_deployment_health(json_input)
        self.write(result)


class ListModels(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def list_models(self):
        sql_query = '''
            SELECT
              model_id,
              to_char(created_timestamp, 'YYYY-MM-DD HH24:MI:SS') AS created_timestamp,
              crop,
              '1/' || scale AS scale
            FROM models
            ORDER BY created_timestamp ASC
        '''
        rows = get_sql_rows(sql_query)
        result = {'models':rows}
        return result

    @tornado.gen.coroutine
    def post(self):
        result = yield self.list_models()
        self.write(result)


class Memory(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_memory(self, json_input):
        seconds = 1
        host = json_input['host']
        port = int(json_input['port'])
        # TODO: Remove hardcoded port
        endpoint = 'http://{host}:{port}/output'.format(
           host=host,
           port=port
        )
        request = requests.get(
           endpoint,
           timeout=seconds
        )
        response = json.loads(request.text)
        return response

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_memory(json_input=json_input)
        self.write(result)


class ReadSlider(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def read_slider(self, json_input):
        web_page = json_input['web_page']
        name = json_input['name']
        result = {}
        sql_query = '''
            SELECT
              amount
            FROM sliders
            WHERE LOWER(web_page) LIKE '%{web_page}%'
              AND LOWER(name) LIKE '%{name}%'
            ORDER BY event_ts DESC
            LIMIT 1;
        '''.format(
            web_page=web_page,
            name=name
        )
        rows = get_sql_rows(sql_query)
        if len(rows) > 0:
            first_row = rows[0]
            amount = first_row['amount']
            result['amount'] = amount
        else:
            result['amount'] = None
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.read_slider(json_input=json_input)
        self.write(result)


class WriteSlider(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def write_slider(self, json_input):
        web_page = json_input['web_page']
        name = json_input['name']
        amount = json_input['amount']
        sql_query = '''
            BEGIN;
            INSERT INTO sliders (
                event_ts,
                web_page,
                name,
                amount
            )
            VALUES (
                NOW(),
               '{web_page}',
               '{name}',
                {amount}
            );
            COMMIT;
        '''.format(
            web_page=web_page,
            name=name,
            amount=amount
        )
        execute_sql(sql_query)
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.write_slider(json_input=json_input)
        self.write(result)


class ListModelDeployments(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_deployments(self):
        result = {}
        devices = ['laptop','pi']
        for device in devices:
            sql_query = '''
                WITH latest AS (
                  SELECT
                    model_id,
                    epoch_id,
                    ROW_NUMBER() OVER(PARTITION BY model_id ORDER BY event_ts DESC) AS latest_rank
                  FROM deployments
                  WHERE LOWER(device) LIKE LOWER('%{device}%')
                )
                SELECT
                  model_id,
                  epoch_id
                FROM latest
                WHERE latest_rank = 1
            '''.format(
                device=device
            )
            rows = get_sql_rows(sql_query)
            if len(rows) > 0:
                first_row = rows[0]
                metadata = {
                    'model_id':first_row['model_id'],
                    'epoch_id':first_row['epoch_id']
                }
                result[device] = metadata
            else:
                metadata = {
                    'model_id': 'N/A',
                    'epoch_id': 'N/A'
                }
                result[device] = metadata
        return result

    @tornado.gen.coroutine
    def post(self):
        result = yield self.get_deployments()
        self.write(result)


class ReadToggle(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def read_toggle(self, json_input):
        web_page = json_input['web_page']
        name = json_input['name']
        detail = json_input['detail']
        result = {}
        sql_query = '''
            SELECT
              is_on
            FROM toggles
            WHERE LOWER(web_page) LIKE '%{web_page}%'
              AND LOWER(name) LIKE '%{name}%'
              AND LOWER(detail) LIKE '%{detail}%'
            ORDER BY event_ts DESC
            LIMIT 1;
        '''.format(
            web_page=web_page,
            name=name,
            detail=detail
        )
        rows = get_sql_rows(sql_query)
        if len(rows) > 0:
            first_row = rows[0]
            is_on = first_row['is_on']
            result['is_on'] = is_on
        else:
            result['is_on'] = False
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.read_toggle(json_input=json_input)
        self.write(result)

class WriteToggle(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def write_toggle(self, json_input):
        web_page = json_input['web_page']
        name = json_input['name']
        detail = json_input['detail']
        is_on = json_input['is_on']
        sql_query = '''
            BEGIN;
            INSERT INTO toggles (
                event_ts,
                web_page,
                name,
                detail,
                is_on
            )
            VALUES (
                NOW(),
               '{web_page}',
               '{name}',
               '{detail}',
                {is_on}
            );
            COMMIT;
        '''.format(
            web_page=web_page,
            name=name,
            detail=detail,
            is_on=is_on
        )
        execute_sql(sql_query)
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.write_toggle(json_input=json_input)
        self.write(result)

class WritePiField(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def write_pi_field(self, json_input):
        column_name = json_input['column_name']
        column_value = json_input['column_value']
        sql_query = '''
            UPDATE raspberry_pi
            SET {column_name} = '{column_value}';
        '''.format(
            column_name=column_name,
            column_value=column_value
        )
        execute_sql(sql_query)
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.write_pi_field(json_input=json_input)
        self.write(result)

class ReadPiField(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def read_pi_field(self, json_input):
        column_name = json_input['column_name']
        sql_query = '''
            SELECT
              {column_name} AS column_value
            FROM raspberry_pi;
        '''.format(
            column_name=column_name
        )
        rows = get_sql_rows(sql=sql_query)
        column_value = None
        if len(rows) > 0:
            first_row = rows[0]
            column_value = first_row['column_value']
        result = {
            'column_value':column_value
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.read_pi_field(json_input=json_input)
        self.write(result)

# Makes a copy of record for model to focus on this record
class Keep(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def keep(self,json_input):
        dataset_name = json_input['dataset']
        record_id = json_input['record_id']
        self.application.record_reader.write_flag(
            dataset=dataset_name,
            record_id=record_id,
            is_flagged=True
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        yield self.keep(json_input=json_input)


class DatasetRecordIdsAPIFileSystem(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_record_ids(self,json_input):
        dataset_name = json_input['dataset']
        dataset_type = json_input['dataset_type']
        if dataset_type.lower() in ['import', 'review', 'flagged']:
            if dataset_type.lower() == 'import':
                # TODO: Change to point to real import datasets
                path_id_pairs = self.application.record_reader.get_dataset_record_ids_filesystem(dataset_name)
            elif dataset_type.lower() == 'review':
                path_id_pairs = self.application.record_reader.get_dataset_record_ids_filesystem(dataset_name)
            elif dataset_type.lower() == 'flagged':
                path_id_pairs = self.application.record_reader.get_dataset_record_ids_filesystem(dataset_name)
            else:
                print('Unknown dataset_type: ' + dataset_type)
            record_ids = []
            for pair in path_id_pairs:
                path, record_id = pair
                record_ids.append(record_id)
            result = {
                'record_ids': record_ids
            }
            return result
        elif dataset_type.lower() == 'critical-errors':
            record_ids = []
            sql_query = '''
                DROP TABLE IF EXISTS latest_deployment;
                CREATE TEMP TABLE latest_deployment AS (
                  SELECT
                    model_id,
                    epoch
                  FROM predictions
                  ORDER BY created_timestamp DESC
                  LIMIT 1
                );

                SELECT
                  records.record_id
                FROM records
                LEFT JOIN predictions
                  ON records.dataset = predictions.dataset
                    AND records.record_id = predictions.record_id
                LEFT JOIN latest_deployment AS deploy
                  ON predictions.model_id = deploy.model_id
                    AND predictions.epoch = deploy.epoch
                WHERE LOWER(records.dataset) LIKE LOWER('%{dataset}%')
                  AND ABS(records.angle - predictions.angle) >= 0.8
                ORDER BY record_id ASC
                '''.format(dataset=dataset_name)
            rows = get_sql_rows(sql_query)
            for row in rows:
                record_id = row['record_id']
                record_ids.append(record_id)
            result = {
                'record_ids': record_ids
            }
            return result
        else:
            print('Unknown dataset_type: ' + dataset_type)

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_record_ids(json_input=json_input)
        self.write(result)

class DatasetRecordIdsAPI(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_record_ids(self,json_input):
        dataset_name = json_input['dataset']
        dataset_type = json_input['dataset_type']
        if dataset_type.lower() in ['import', 'review', 'flagged']:
            if dataset_type.lower() == 'import':
                # TODO: Change to point to real import datasets
                ids = self.application.record_reader.get_dataset_record_ids(dataset_name)
            elif dataset_type.lower() == 'review':
                ids = self.application.record_reader.get_dataset_record_ids(dataset_name)
            elif dataset_type.lower() == 'flagged':
                ids = self.application.record_reader.get_dataset_record_ids(dataset_name)
            else:
                print('Unknown dataset_type: ' + dataset_type)
            record_ids = []
            for record_id in ids:
                record_ids.append(record_id)
            result = {
                'record_ids': record_ids
            }
            return result
        elif dataset_type.lower() == 'critical-errors':
            record_ids = []
            sql_query = '''
                DROP TABLE IF EXISTS latest_deployment;
                CREATE TEMP TABLE latest_deployment AS (
                  SELECT
                    model_id,
                    epoch
                  FROM predictions
                  ORDER BY created_timestamp DESC
                  LIMIT 1
                );

                SELECT
                  records.record_id
                FROM records
                LEFT JOIN predictions
                  ON records.dataset = predictions.dataset
                    AND records.record_id = predictions.record_id
                LEFT JOIN latest_deployment AS deploy
                  ON predictions.model_id = deploy.model_id
                    AND predictions.epoch = deploy.epoch
                WHERE LOWER(records.dataset) LIKE LOWER('%{dataset}%')
                  AND ABS(records.angle - predictions.angle) >= 0.8
                ORDER BY record_id ASC
                '''.format(dataset=dataset_name)
            rows = get_sql_rows(sql_query)
            for row in rows:
                record_id = row['record_id']
                record_ids.append(record_id)
            result = {
                'record_ids': record_ids
            }
            return result
        else:
            print('Unknown dataset_type: ' + dataset_type)

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_record_ids(json_input=json_input)
        self.write(result)

class IsDatasetPredictionFromLatestDeployedModel(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def are_predictions_from_deployed_model(self, json_input):
        dataset_name = json_input['dataset']
        sql_query = '''
            DROP TABLE IF EXISTS latest_deployment;
            CREATE TEMP TABLE latest_deployment AS (
              SELECT
                model_id,
                epoch
              FROM predictions
              ORDER BY created_timestamp DESC
              LIMIT 1
            );

            SELECT
              AVG(CASE
                WHEN deploy.epoch IS NOT NULL
                  THEN 100.0
                ELSE 0.0 END) = 100 AS is_up_to_date
            FROM records
            LEFT JOIN predictions
              ON records.dataset = predictions.dataset
                AND records.record_id = predictions.record_id
            LEFT JOIN latest_deployment AS deploy
              ON predictions.model_id = deploy.model_id
                AND predictions.epoch = deploy.epoch
            WHERE LOWER(records.dataset) LIKE LOWER('%{dataset}%')
            '''.format(dataset=dataset_name)
        first_row = get_sql_rows(sql_query)[0]
        is_up_to_date = first_row['is_up_to_date']
        result = {
            'is_up_to_date': is_up_to_date
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.are_predictions_from_deployed_model(json_input=json_input)
        self.write(result)


class SaveRecordToDB(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def save_record_to_db(self, json_input):
        try:
            dataset_name = json_input['dataset']
            record_id = json_input['record_id']
            label_path = self.application.record_reader.get_label_path(
                dataset_name=dataset_name,
                record_id=record_id
            )
            image_path = self.application.record_reader.get_image_path(
                dataset_name=dataset_name,
                record_id=record_id
            )
            _, angle, throttle = self.application.record_reader.read_record(
                label_path=label_path
            )
            sql_query = '''
                BEGIN;
                INSERT INTO records (
                    dataset,
                    record_id,
                    label_path,
                    image_path,
                    angle,
                    throttle
                )
                VALUES (
                   '{dataset}',
                    {record_id},
                   '{label_path}',
                   '{image_path}',
                    {angle},
                    {throttle}
                );
                COMMIT;
            '''.format(
                dataset=dataset_name,
                record_id=record_id,
                label_path=label_path,
                image_path=image_path,
                angle=angle,
                throttle=throttle
            )
            execute_sql(sql_query)
            return {}
        except:
            print(json_input)
            traceback.print_exc()

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        _ = self.save_record_to_db(json_input=json_input)
        self.write({})

class IsRecordAlreadyFlagged(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def is_record_already_flagged(self,json_input):
        dataset_name = json_input['dataset']
        record_id = json_input['record_id']
        is_flagged = self.application.record_reader.read_flag(
            dataset=dataset_name,
            record_id=record_id
        )
        result = {
            'is_already_flagged': is_flagged
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.is_record_already_flagged(json_input=json_input)
        self.write(result)


class DeployModel(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def deploy_model(self, json_input):
        device = json_input['device']
        checkpoint_directory_sql = """
            SELECT
              deploy_model_parent_path
            FROM raspberry_pi
        """.format(
            device=device
        )
        checkpoint_directory = get_sql_rows(checkpoint_directory_sql)[0]['deploy_model_parent_path']

        # TODO: Don't hardcode any of these things
        port = 8885
        angle_only = 'y'

        # Kill any currently running model API
        try:
            process = subprocess.Popen(
                'docker rm -f laptop-predict',
                shell=True
            ).wait()
        except:
            # Most likely means API is not up
            print('Failed: docker rm -f laptop-predict')

        sql_query = """
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
        """.format(
            device=device
        )
        first_row = get_sql_rows(sql_query)[0]
        model_id = first_row['model_id']
        epoch = first_row['epoch_id']
        scale = first_row['scale']
        crop = first_row['crop']
        checkpoint_directory = checkpoint_directory + '/{0}/checkpoints'.format(model_id)
        command = '''
            docker run -i -t -d -p {host_port}:8885 \
                --volume {checkpoint_directory}:/root/ai/model-archives/model/checkpoints \
                --name laptop-predict \
                --network app_network \
                ryanzotti/ai-laptop:latest \
                python /root/ai/microservices/predict.py \
                    --port 8885 \
                    --image_scale {scale} \
                    --angle_only {angle_only} \
                    --crop_percent {crop_percent} \
                    --model_id {model_id} \
                    --epoch {epoch_id}
        '''.format(
            host_port=port,
            checkpoint_directory=checkpoint_directory,
            scale=scale,
            angle_only=angle_only,
            crop_percent=crop,
            model_id=model_id,
            epoch_id=epoch
        )
        process = subprocess.Popen(
            command,
            shell=True
        )

        result = {}
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.deploy_model(json_input=json_input)
        self.write(result)


# Given a dataset name and record ID, return the user
# angle and throttle
class UserLabelsAPI(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_user_babels(self,json_input):
        dataset_name = json_input['dataset']
        record_id = int(json_input['record_id'])
        label_file_path = self.application.record_reader.get_label_path(
            dataset_name=dataset_name,
            record_id=record_id
        )
        _, angle, throttle = self.application.record_reader.read_record(
            label_path=label_file_path)
        result = {
            'angle': angle,
            'throttle': throttle
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_user_babels(json_input=json_input)
        self.write(result)

# This API might seem redundant given that I already have
# a separate API for producing predictions, but UI's version
# of the image has already been compressed once. Sending the
# compressed image to the model API would compress the image
# again (compression happens each time image is transferred)
# and this would lead to slightly different results vs if
# the image file is passed just once, between this API and
# the model API
class AIAngleAPI(tornado.web.RequestHandler):

    # Prevents awful blocking
    # https://infinitescript.com/2017/06/making-requests-non-blocking-in-tornado/
    executor = ThreadPoolExecutor(100)

    @tornado.concurrent.run_on_executor
    def get_prediction(self, json_input):
        dataset_name = json_input['dataset']
        record_id = json_input['record_id']

        frame = self.application.record_reader.get_image(
            dataset_name=dataset_name,
            record_id=record_id
        )

        img = cv2.imencode('.jpg', frame)[1].tostring()
        files = {'image': img}
        # TODO: Remove hard-coded model API
        request = requests.post('http://localhost:8885/predict', files=files)
        response = json.loads(request.text)
        prediction = response['prediction']
        predicted_angle = prediction[0]
        result = {
            'angle': predicted_angle
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_prediction(json_input)
        self.write(result)


class UpdateDeploymentsTable(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def update_deployments_table(self,json_input):
        device = json_input['device']
        model_id = json_input['model_id']

        sql_epoch_query = '''
            SELECT
              max(epoch) AS epoch_id
            FROM epochs WHERE model_id = {model_id}
        '''.format(
            model_id=model_id
        )
        epoch_id = get_sql_rows(sql_epoch_query)[0]['epoch_id']

        insert_deployment_record_sql = """
            INSERT INTO deployments (
                device,
                model_id,
                epoch_id,
                event_ts
            ) VALUES (
                '{device}',
                 {model_id},
                 {epoch_id},
                 NOW()
            );
        """.format(
            device=device,
            model_id=model_id,
            epoch_id=epoch_id
        )
        execute_sql(insert_deployment_record_sql)

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        yield self.update_deployments_table(json_input=json_input)


class DeleteModel(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def delete_model(self,json_input):
        model_id = json_input['model_id']
        # Delete the model folder and files
        sql_query = '''
            SELECT
              deploy_model_parent_path AS parent_directory
            FROM raspberry_pi;
        '''
        rows = get_sql_rows(sql=sql_query)
        parent_directory = rows[0]['parent_directory']
        full_path = os.path.join(parent_directory,str(model_id))
        rmtree(full_path)
        # Delete the model from the table
        delete_records_sql = """
            DELETE FROM models
            WHERE model_id = {model_id};

            DELETE FROm epochs
            WHERE model_id = {model_id};
        """.format(
            model_id=model_id
        )
        execute_sql(delete_records_sql)

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        yield self.delete_model(json_input=json_input)


class DeleteRecord(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def delete_record(self,json_input):
        dataset_name = json_input['dataset']
        record_id = json_input['record_id']
        label_path = self.application.record_reader.get_label_path(
            dataset_name=dataset_name,
            record_id=record_id
        )
        image_path = self.application.record_reader.get_image_path(
            dataset_name=dataset_name,
            record_id=record_id
        )
        delete_records_sql = """
            DELETE FROM records
            WHERE record_id = {record_id}
              AND LOWER(dataset) LIKE '{dataset}';
        """.format(
            record_id=record_id,
            dataset=dataset_name
        )
        execute_sql(delete_records_sql)
        delete_predictions_sql = """
            DELETE FROM predictions
            WHERE record_id = {record_id}
              AND LOWER(dataset) LIKE '{dataset}';
        """.format(
            record_id=record_id,
            dataset=dataset_name
        )
        execute_sql(delete_predictions_sql)
        os.remove(label_path)
        os.remove(image_path)

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        yield self.delete_record(json_input=json_input)


class DeleteFlaggedRecord(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def delete_flagged_record(self,json_input):
        dataset_name = json_input['dataset']
        record_id = json_input['record_id']
        self.application.record_reader.write_flag(
            dataset=dataset_name,
            record_id=record_id,
            is_flagged=False
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.delete_flagged_record(json_input=json_input)
        self.write(result)

class DeleteFlaggedDataset(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def delete_flagged_dataset(self,json_input):
        dataset_name = json_input['dataset']
        self.application.record_reader.unflag_dataset(
            dataset=dataset_name,
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.delete_flagged_dataset(json_input=json_input)
        self.write(result)

class DeleteDataset(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def delete_dataset(self,json_input):
        dataset_name = json_input['dataset']
        self.application.record_reader.delete_dataset(
            dataset_name=dataset_name,
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.delete_dataset(json_input=json_input)
        self.write(result)

class ImageCountFromDataset(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_image_count(self,json_input):
        dataset_name = json_input['dataset']
        dataset_type = json_input['dataset_type']
        if dataset_type.lower() == 'import':
            # TODO: Change to point to real import datasets
            image_count = self.application.record_reader.get_image_count_from_dataset(
                dataset_name=dataset_name
            )
        elif dataset_type.lower() == 'review':
            image_count = self.application.record_reader.get_image_count_from_dataset(
                dataset_name=dataset_name
            )
        elif dataset_type.lower() == 'mistake':
            image_count = self.application.record_reader.get_flagged_record_count(
                dataset_name=dataset_name
            )
        else:
            print('Unknown dataset_type: ' + dataset_type)
        result = {
            'image_count': image_count
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_image_count(json_input=json_input)
        self.write(result)

class DatasetIdFromDataName(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_dataset_id_from_name(self,json_input):
        dataset_name = json_input['dataset']
        dataset_id = self.application.record_reader.get_dataset_id_from_dataset_name(
            dataset_name=dataset_name
        )
        result = {
            'dataset_id': dataset_id
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_dataset_id_from_name(json_input=json_input)
        self.write(result)

class DatasetDateFromDataName(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_dataset_date(self,json_input):
        dataset_name = json_input['dataset']
        dataset_date = self.application.record_reader.get_dataset_date_from_dataset_name(
            dataset_name=dataset_name
        )
        result = {
            'dataset_date': dataset_date
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.get_dataset_date(json_input=json_input)
        self.write(result)

class ListReviewDatasets(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_review_datasets(self):
        dataset_names = self.application.record_reader.get_dataset_names()
        results = {
            'datasets': dataset_names
        }
        return results

    @tornado.gen.coroutine
    def get(self):
        results = yield self.get_review_datasets()
        self.write(results)


class ListReviewDatasetsFileSystem(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_review_datasets(self):
        folder_file_paths = self.application.record_reader.folders
        dataset_names = self.application.record_reader.get_dataset_names_filesystem(
            file_paths=folder_file_paths
        )
        results = {
            'datasets': dataset_names
        }
        return results

    @tornado.gen.coroutine
    def get(self):
        results = yield self.get_review_datasets()
        self.write(results)



class ImageAPI(tornado.web.RequestHandler):
    '''
    Serves a MJPEG of the images posted from the vehicle.
    '''

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):

        dataset = self.get_argument("dataset")
        record_id = self.get_argument("record-id")
        ioloop = tornado.ioloop.IOLoop.current()
        self.set_header("Content-type", "multipart/x-mixed-replace;boundary=--boundarydonotcross")

        self.served_image_timestamp = time.time()
        my_boundary = "--boundarydonotcross"
        frame = self.application.record_reader.get_image(
            dataset_name=dataset,
            record_id=record_id
        )
        image_scale_args = self.get_arguments(name="scale-factor")
        if len(image_scale_args) > 0:
            scale = int(image_scale_args[0])
            frame = show_resize_effect(
                original_image=frame,
                scale=scale
            )
        crop_percent_args = self.get_arguments(name="crop-percent")
        if len(crop_percent_args) > 0:
            crop_percent = int(crop_percent_args[0])
            frame = pseduo_crop(
                image=frame,
                crop_percent=crop_percent,
                alpha=0.65
            )

        # Can't serve the OpenCV numpy array
        # Tornando: "... only accepts bytes, unicode, and dict objects" (from Tornado error Traceback)
        # The result of cv2.imencode is a tuple like: (True, some_image), but I have no idea what True refers to
        img = cv2.imencode('.jpg', frame)[1].tostring()

        # I have no idea what these lines do, but other people seem to use them, they
        # came with this copied code and I don't want to break something by removing
        self.write(my_boundary)
        self.write("Content-type: image/jpeg\r\n")
        self.write("Content-length: %s\r\n\r\n" % len(img))

        # Serve the image
        self.write(img)

        self.served_image_timestamp = time.time()
        yield tornado.gen.Task(self.flush)


class VideoAPI(tornado.web.RequestHandler):
    '''
    Serves a MJPEG of the images posted from the vehicle.
    '''

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):

        host = self.get_argument("host")
        port = int(self.get_argument("port"))

        ioloop = tornado.ioloop.IOLoop.current()
        self.set_header("Content-type", "multipart/x-mixed-replace;boundary=--boundarydonotcross")

        self.served_image_timestamp = time.time()
        my_boundary = "--boundarydonotcross"

        for frame in live_video_stream(host,port=port):

            interval = .1
            if self.served_image_timestamp + interval < time.time():

                # Can't serve the OpenCV numpy array
                # Tornando: "... only accepts bytes, unicode, and dict objects" (from Tornado error Traceback)
                # The result of cv2.imencode is a tuple like: (True, some_image), but I have no idea what True refers to
                img = cv2.imencode('.jpg', frame)[1].tostring()

                # I have no idea what these lines do, but other people seem to use them, they
                # came with this copied code and I don't want to break something by removing
                self.write(my_boundary)
                self.write("Content-type: image/jpeg\r\n")
                self.write("Content-length: %s\r\n\r\n" % len(img))

                # Serve the image
                self.write(img)

                self.served_image_timestamp = time.time()
                yield tornado.gen.Task(self.flush)
            else:
                yield tornado.gen.Task(ioloop.add_timeout, ioloop.time() + interval)



class PS3ControllerSixAxisStart(tornado.web.RequestHandler):

    """
    Start the SixAxis module so that commands from the controller
    can be relayed to the car
    """

    executor = ThreadPoolExecutor(3)

    @tornado.concurrent.run_on_executor
    def start_sixaxis_loop(self, json_input):
        host = json_input['host']
        port = json_input['port']
        try:
            seconds = 0.5
            endpoint = 'http://{host}:{port}/start-sixaxis-loop'.format(
                host=host,
                port=port
            )
            response = requests.post(
                endpoint,
                timeout=seconds
            )
            result = json.loads(response.text)
            return result
        except:
            return {'is_healthy': False}

    @tornado.gen.coroutine
    def post(self):
        result = {}
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.start_sixaxis_loop(json_input=json_input)
        self.write(result)


class IsPS3ControllerConnected(tornado.web.RequestHandler):

    """
    This says if js0 is available at /dev/input. If true, it
    means that the controller is either connected using the
    cable or Bluetooth. It should not be confused with the
    controller health check, which checks if the SixAxis
    module is able to connect. I'm keeping them separate to
    make it easier to find the root cause of the problem if
    a problem arises
    """

    executor = ThreadPoolExecutor(3)

    @tornado.concurrent.run_on_executor
    def is_connected(self, json_input):
        host = json_input['host']
        port = json_input['port']
        try:
            seconds = 0.5
            endpoint = 'http://{host}:{port}/is-connected'.format(
                host=host,
                port=port
            )
            response = requests.post(
                endpoint,
                timeout=seconds
            )
            result = json.loads(response.text)
            return result
        except:
            return {'is_connected': False}

    @tornado.gen.coroutine
    def post(self):
        result = {}
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.is_connected(json_input=json_input)
        self.write(result)


class InitiaizePS3Setup(tornado.web.RequestHandler):

    """
    This class removes all PS3 controllers from the list of devices
    that you see in the bluetoothctl console when you type `devices`

    The instructions I've read online assume you're only using one
    PS3 device. It assumes that when you type the "devices" command
    you'll know which MAC address to copy because you'll only see
    one PS3 controller. If you have multiple registered PS3
    controllers, then you will have no way to tell which is which.
    The physical PS3 does not have any label about its MAC address
    so you couldn't figure it out even if you wanted to. So, what
    should you do if you need multiple controllers, for example if
    you're at a live event, and the battery of your first controller
    dies and you need the second? Assume that you will need to go
    through the registration process all over again with the second
    controller, which means wiping all registered controllers from
    the list of registered devices. That is what this class does.
    """

    executor = ThreadPoolExecutor(10)

    @tornado.concurrent.run_on_executor
    def run(self, json_input):
        host = json_input['host']
        port = json_input['port']
        try:
            seconds = 3.0
            endpoint = 'http://{host}:{port}/is-ps3-connected'.format(
                host=host,
                port=port
            )
            _ = requests.post(
                endpoint,
                timeout=seconds,
                data = json.dumps(json_input)
            )
        except:
            return {'is_success': False}
        return {'is_success': True}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.run(json_input=json_input)
        self.write(result)


class PS3SudoSixPair(tornado.web.RequestHandler):

    """
    This runs the first PS3 step, calling `sudo sixpair`. It
    has the annoying side effect of making it appear as though
    the user has unplugged the controller, but this annoying
    behavior is expected, according to the official docus:
    https://pythonhosted.org/triangula/sixaxis.html. Anyways,
    The user will need to reconnect after this step is run
    """

    executor = ThreadPoolExecutor(3)

    @tornado.concurrent.run_on_executor
    def run_sudo_sixpair(self, json_input):
        host = json_input['host']
        port = json_input['port']
        try:
            seconds = 1.0
            endpoint = 'http://{host}:{port}/sudo-sixpair'.format(
                host=host,
                port=port
            )
            _ = requests.post(
                endpoint,
                timeout=seconds
            )
            return {'is_success':True}
        except:
            return {'is_success':False}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.run_sudo_sixpair(json_input=json_input)
        self.write(result)


class RunPS3Setup(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(10)

    @tornado.concurrent.run_on_executor
    def run_setup(self, json_input):
        host = json_input['host']
        port = json_input['port']
        try:
            seconds = 5
            endpoint = 'http://{host}:{port}/run-setup-commands'.format(
                host=host,
                port=port
            )
            response = requests.post(
                endpoint,
                timeout=seconds
            )
            _ = json.loads(response.text)
            return {'is_success':True}
        except:
            return {'is_success': False}

    @tornado.gen.coroutine
    def post(self):
        result = {}
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.run_setup(json_input=json_input)
        self.write(result)


class StopService(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(10)

    @tornado.concurrent.run_on_executor
    def stop_service(self, json_input):
        host = json_input['host']
        service = json_input['service']
        command = "docker rm -f {service}".format(service=service)
        if host == 'localhost':
            # Ignore exceptions due to Docker not finding an image
            try:
                subprocess.run(
                    command,
                    shell=True,
                    check=False,
                    stderr=False,
                    stdout=False
                )
            except:
                pass
        else:
            asyncio.set_event_loop(asyncio.new_event_loop())
            execute_pi_command(
                command=command
            )
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.stop_service(json_input=json_input)
        self.write(result)

class StartCarService(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(100)

    @tornado.concurrent.run_on_executor
    def submit_pi_command(self, command):
        asyncio.set_event_loop(asyncio.new_event_loop())
        execute_pi_command(command=command)

    @tornado.concurrent.run_on_executor
    def submit_local_shell_command(self, command):
        asyncio.set_event_loop(asyncio.new_event_loop())
        shell_command(cmd=command)

    @tornado.gen.coroutine
    def post(self):
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
            'mac':{
                'network':'--network car_network -p {port}:{port}',
            },
            'linux':{
                'network': '--net=host',
            }
        }
        json_input = tornado.escape.json_decode(self.request.body)
        operating_system = json_input['target_host_os'].lower()
        target_host = json_input['target_host_type'].lower()
        service = json_input['service'].lower()
        # TODO: Remove hardcoded ports
        result = {}
        if service == 'record-tracker':
            port = 8093
            network = operating_system_config[operating_system]['network'].format(port=port)
            if target_host == 'pi':
                self.submit_pi_command(
                    command='mkdir -p ~/vehicle-datasets; docker rm -f {service}; docker run -t -d -i {network} --name {service} --volume ~/vehicle-datasets:/datasets ryanzotti/record-tracker:latest python3 /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
            elif target_host == 'laptop':
                self.submit_local_shell_command(command='mkdir -p ~/vehicle-datasets; docker rm -f {service}; docker run -t -d -i {network} --name {service} --volume ~/vehicle-datasets:/datasets ryanzotti/record-tracker:latest python3 /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'video':
            port = 8091
            network = operating_system_config[operating_system]['network'].format(port=port)
            if target_host == 'pi':
                self.submit_pi_command(command='docker rm -f {service}; docker run -t -d -i --device=/dev/video0 {network} --name {service} ryanzotti/ffmpeg:latest'.format(
                        service=service,
                        network=network
                    )
                )
            elif target_host == 'laptop':
                self.submit_local_shell_command(command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/ffmpeg:latest python3 /root/tests/fake_server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'control-loop':
            port = 8887
            network = operating_system_config[operating_system]['network'].format(port=port)
            if target_host == 'pi':
                self.submit_pi_command(command='docker rm -f {service}; docker run -i -t -d {network} --name {service} ryanzotti/control_loop:latest python3 /root/car/start.py --port {port} --localhost'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
            elif target_host == 'laptop':
                self.submit_local_shell_command(command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/control_loop:latest python3 /root/car/start.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'user-input':
            port = 8884
            network = operating_system_config[operating_system]['network'].format(port=port)
            if target_host == 'pi':
                self.submit_pi_command(command='docker rm -f {service}; docker run -i -t {network} --name {service} --privileged -d ryanzotti/user_input:latest python3 /root/server.py --port 8884'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
            elif target_host == 'laptop':
                self.submit_local_shell_command(command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/user_input:latest python3 /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'engine':
            port = 8092
            network = operating_system_config[operating_system]['network'].format(port=port)
            if target_host == 'pi':
                self.submit_pi_command(command='docker rm -f {service}; docker run -t -d -i --privileged {network} --name {service} ryanzotti/vehicle-engine:latest'.format(
                        service=service,
                        network=network
                    )
                )
            elif target_host == 'laptop':
                self.submit_local_shell_command(command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/vehicle-engine:latest python3 /root/tests/fake_server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'ps3-controller':
            port = 8094
            network = operating_system_config[operating_system]['network'].format(port=port)
            if target_host == 'pi':
                self.submit_pi_command(command=
                    'docker rm -f {service}; docker run -i -t --name {service} {network} --volume /dev/bus/usb:/dev/bus/usb --volume /run/dbus:/run/dbus --volume /var/run/dbus:/var/run/dbus --volume /dev/input:/dev/input --privileged ryanzotti/ps3_controller:latest python /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
            elif target_host == 'laptop':
                self.submit_local_shell_command(command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/ps3_controller:latest python /root/tests/fake_server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        elif service == 'memory':
            port = 8095
            network = operating_system_config[operating_system]['network'].format(port=port)
            if target_host == 'pi':
                self.submit_pi_command(command=
                    'docker rm -f {service}; docker run -i -t -d --name {service} {network} ryanzotti/vehicle-memory:latest python /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
            elif target_host == 'laptop':
                self.submit_local_shell_command(command='docker rm -f {service}; docker run -t -d -i {network} --name {service} ryanzotti/vehicle-memory:latest python /root/server.py --port {port}'.format(
                        service=service,
                        network=network,
                        port=port
                    )
                )
        self.write({})


# Checks if ffserver and ffmpeg are running. Assumes
# ffmpeg can't run w/o ffserver, so only bothers to
# check ffmpeg
class VideoHealthCheck(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def is_video_available(self):
        try:
            # Check if ffmpeg is accepting connections
            # TODO: Remove hard-coded IP
            ip = 'ryanzotti.local'
            stream = urllib.request.urlopen('http://{ip}:8091/video'.format(ip=self.application.pi_host))
            return {'is_running': True}
        except:
            return {'is_running': False}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.is_video_available()
        self.write(result)


class PiHealthCheck(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def health_check(self):
        asyncio.set_event_loop(asyncio.new_event_loop())
        return {
            'is_able_to_connect':is_pi_healthy('ls -ltr')
        }

    @tornado.gen.coroutine
    def post(self):
        result = yield self.health_check()
        self.write(result)


class PS3ControllerHealth(tornado.web.RequestHandler):

    """
    This should not be confused with the health of the
    PS3 controller service. This checks if the SixAxis
    (custom PS3 module) is able to connect to the
    controller. The PS3 controller service might be up
    and healthy, but it might not be connected to the
    controller. This will always be true the before you
    have paired the controller with the service
    """

    # Need lots of threads because there are many services
    executor = ThreadPoolExecutor(3)

    @tornado.concurrent.run_on_executor
    def health_check(self,json_input):
        host = json_input['host']
        # TODO: Remove this hardcoded port
        port = 8094

        try:
            seconds = 0.5
            endpoint = 'http://{host}:{port}/ps3-health'.format(
                host=host,
                port=port
            )
            response = requests.get(
                endpoint,
                timeout=seconds
            )
            result = json.loads(response.text)
            return result
        except:
            return {'is_healthy': False}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.health_check(json_input=json_input)
        self.write(result)


class PiServiceHealth(tornado.web.RequestHandler):

    # Need lots of threads because there are many services
    executor = ThreadPoolExecutor(30)

    @tornado.concurrent.run_on_executor
    def health_check(self,json_input):
        service = json_input['service']
        host = json_input['host']
        # TODO: Remove these hardcoded ports and accept as arg in json_input
        ports = {
            'record-tracker':8093,
            'video':8091,
            'control-loop':8887,
            'user-input':8884,
            'engine':8092,
            'ps3-controller':8094,
            'memory':8095
        }
        port = ports[service]
        try:
            seconds = 0.5
            endpoint = 'http://{host}:{port}/health'.format(
                host=host,
                port=port
            )
            _ = requests.get(
                endpoint,
                timeout=seconds
            )
            return {'is_healthy': True}
        except:
            return {'is_healthy': False}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.health_check(json_input=json_input)
        self.write(result)

class ResumeTraining(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def resume_training(self, json_input):
        model_id = json_input['model_id']
        resume_training(
            model_id=model_id,
            host_data_path=get_datasets_path()
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.resume_training(json_input=json_input)
        self.write(result)


class StopTraining(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def stop_training(self):
        stop_training()
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.stop_training()
        self.write(result)


class TrainNewModel(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def train_new_model(self, json_input):

        train_new_model(
            data_path=get_datasets_path(),
            epochs=100,
            image_scale=json_input['scale'],
            crop_percent=json_input['crop_percent']
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.train_new_model(json_input=json_input)
        self.write(result)


class IsTraining(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def health_check(self):
        seconds = 0.5
        try:
            # TODO: Remove hardcoded port
            request = requests.post(
                'http://localhost:8091/training-state',
                timeout=seconds
            )
            response = json.loads(request.text)
            response['is_alive'] = True
            return response
        except:
            return {'is_alive': False}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.health_check()
        self.write(result)



class DoesModelAlreadyExist(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def does_model_exist(self):
        exists = os.path.exists(self.application.model_path)
        result = {'exists': exists}
        return result

    @tornado.gen.coroutine
    def post(self):
        result = yield self.does_model_exist()
        self.write(result)


class BatchPredict(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def batch_predict(self,json_input):
        dataset_name = json_input['dataset']
        process = batch_predict(
            dataset=dataset_name,
            # TODO: Remove this hardcoded port
            predictions_port='8885',
            datasets_port=self.application.port
        )
        result = {}
        return result

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.batch_predict(json_input=json_input)
        self.write(result)


class IsDatasetPredictionSyncing(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def is_prediction_syncing(self,json_input):
        dataset_name = json_input['dataset']
        sql_query = '''
            SELECT
              COUNT(*) > 0 AS answer
            FROM live_prediction_sync
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%')
        '''.format(
            dataset=dataset_name
        )
        rows = get_sql_rows(sql=sql_query)
        first_row = rows[0]
        return {
            'is_syncing': first_row['answer']
        }

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.is_prediction_syncing(json_input=json_input)
        self.write(result)


class NewEpochs(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_epochs(self,json_inputs):
        model_id = json_inputs['model_id']
        sql_query = '''
            CREATE TEMP TABLE recent_epochs AS (
                SELECT
                  epochs.epoch,
                  epochs.train,
                  epochs.validation
                FROM epochs
                WHERE epochs.model_id = {model_id}
                ORDER BY epochs.epoch DESC
                LIMIT 10
            );
            SELECT
              *
            FROM recent_epochs
            ORDER BY epoch ASC
        '''.format(
            model_id=model_id
        )
        epochs = get_sql_rows(sql=sql_query)
        result = {
            'epochs':epochs
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_inputs = tornado.escape.json_decode(self.request.body)
        result = yield self.get_epochs(json_inputs=json_inputs)
        self.write(result)


class RefreshRecordReader(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def refresh(self):
        self.application.record_reader.refresh_folders()
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.refresh()
        self.write(result)


class DatasetPredictionSyncPercent(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_sync_percent(self,json_inputs):
        dataset_name = json_inputs['dataset']
        sql_query = '''
            DROP TABLE IF EXISTS latest_deployment;
            CREATE TEMP TABLE latest_deployment AS (
              SELECT
                model_id,
                epoch
              FROM predictions
              ORDER BY created_timestamp DESC
              LIMIT 1
            );

            SELECT
              AVG(CASE
                WHEN predictions.angle IS NOT NULL
                  THEN 100.0
                ELSE 0.0 END) AS completion_percent
            FROM records
            LEFT JOIN predictions
              ON records.dataset = predictions.dataset
                AND records.record_id = predictions.record_id
            LEFT JOIN latest_deployment AS deploy
              ON predictions.model_id = deploy.model_id
                AND predictions.epoch = deploy.epoch
            WHERE LOWER(records.dataset) LIKE LOWER('%{dataset}%')
        '''.format(
            dataset=dataset_name
        )
        rows = get_sql_rows(sql=sql_query)
        first_row = rows[0]
        result = {
            'percent':float(first_row['completion_percent'])
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        json_inputs = tornado.escape.json_decode(self.request.body)
        result = yield self.get_sync_percent(json_inputs=json_inputs)
        self.write(result)


class GetDatasetErrorMetrics(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    def get_latest_deployment(self,dataset):

        seconds = 1
        try:
            request = requests.post(
                # TODO: Remove hardcoded port
                'http://{host}:8885/model-metadata'.format(host='localhost'),
                timeout=seconds
            )
            response = json.loads(request.text)
            return response
        except:
            return None


    @tornado.concurrent.run_on_executor
    def get_error_metrics(self,json_inputs):
        dataset_name = json_inputs['dataset']
        latest_deployment = self.get_latest_deployment(dataset=dataset_name)
        if latest_deployment is not None:
            model_id = latest_deployment['model_id']
            epoch = latest_deployment['epoch_id']
            sql_query = '''
                SELECT
                  SUM(CASE WHEN ABS(records.angle - predictions.angle) >= 0.8
                    THEN 1 ELSE 0 END) AS critical_count,
                  AVG(CASE WHEN ABS(records.angle - predictions.angle) >= 0.8
                    THEN 100.0 ELSE 0.0 END)::FLOAT AS critical_percent,
                  AVG(ABS(records.angle - predictions.angle)) AS avg_abs_error,
                  COUNT(*) AS prediction_count
                FROM records
                LEFT JOIN predictions
                  ON records.dataset = predictions.dataset
                    AND records.record_id = predictions.record_id
                WHERE LOWER(records.dataset) LIKE LOWER('%{dataset}%')
                  AND model_id = {model_id}
                  AND epoch = {epoch};
            '''.format(
                dataset=dataset_name,
                model_id=model_id,
                epoch=epoch
            )
            rows = get_sql_rows(sql=sql_query)
            first_row = rows[0]
            if first_row['prediction_count'] > 0:
                result = {
                    'critical_count': float(first_row['critical_count']),
                    'critical_percent': str(round(float(first_row['critical_percent']), 1)) + '%',
                    'avg_abs_error': round(float(first_row['avg_abs_error']), 2)
                }
                return result
            else:
                return {
                    'critical_count': 'N/A',
                    'critical_percent': 'N/A',
                    'avg_abs_error': 'N/A'
                }
        else:
            return {
                'critical_count': 'N/A',
                'critical_percent': 'N/A',
                'avg_abs_error': 'N/A'
            }

    @tornado.gen.coroutine
    def post(self):
        json_inputs = tornado.escape.json_decode(self.request.body)
        result = yield self.get_error_metrics(json_inputs=json_inputs)
        self.write(result)

def make_app():
    this_dir = os.path.dirname(os.path.realpath(__file__))
    assets_absolute_path = os.path.join(this_dir, 'dist', 'assets')
    html_absolute_path = os.path.join(this_dir, 'dist')
    handlers = [
        (r"/", tornado.web.RedirectHandler, dict(url="/index.html")),
        (r"/home", Home),
        (r"/ai-angle", AIAngleAPI),
        (r"/user-labels", UserLabelsAPI),
        (r"/image", ImageAPI),
        (r"/video", VideoAPI),
        (r"/new-dataset-name", NewDatasetName),
        (r"/video-health-check", VideoHealthCheck),
        (r"/update-drive-state", UpdateDriveState),
        (r"/dataset-record-ids",DatasetRecordIdsAPI),
        (r"/dataset-record-ids-filesystem", DatasetRecordIdsAPIFileSystem),
        (r"/deployment-health", DeploymentHealth),
        (r"/delete-model", DeleteModel),
        (r"/delete",DeleteRecord),
        (r"/delete-dataset", DeleteDataset),
        (r"/save-reocord-to-db", SaveRecordToDB),
        (r"/delete-flagged-record", DeleteFlaggedRecord),
        (r"/delete-flagged-dataset", DeleteFlaggedDataset),
        (r"/add-flagged-record", Keep),
        (r"/list-models", ListModels),
        (r"/list-import-datasets", ListReviewDatasets),
        (r"/list-review-datasets", ListReviewDatasets),
        (r"/list-datasets-filesystem", ListReviewDatasetsFileSystem),
        (r"/image-count-from-dataset", ImageCountFromDataset),
        (r"/is-record-already-flagged", IsRecordAlreadyFlagged),
        (r"/dataset-id-from-dataset-name", DatasetIdFromDataName),
        (r"/dataset-date-from-dataset-name", DatasetDateFromDataName),
        (r"/(.*.html)", tornado.web.StaticFileHandler, {"path": html_absolute_path}),
        (r"/assets/(.*)", tornado.web.StaticFileHandler, {"path": assets_absolute_path}),
        (r"/resume-training", ResumeTraining),
        (r"/stop-training", StopTraining),
        (r"/train-new-model", TrainNewModel),
        (r"/list-model-deployments", ListModelDeployments),
        (r"/update-deployments-table", UpdateDeploymentsTable),
        (r"/deploy-model", DeployModel),
        (r"/are-dataset-predictions-updated", IsDatasetPredictionFromLatestDeployedModel),
        (r"/is-training", IsTraining),
        (r"/does-model-already-exist", DoesModelAlreadyExist),
        (r"/batch-predict", BatchPredict),
        (r"/is-dataset-prediction-syncing", IsDatasetPredictionSyncing),
        (r"/dataset-prediction-sync-percent", DatasetPredictionSyncPercent),
        (r"/get-dataset-error-metrics", GetDatasetErrorMetrics),
        (r"/get-new-epochs", NewEpochs),
        (r"/write-toggle", WriteToggle),
        (r"/read-toggle", ReadToggle),
        (r"/write-slider", WriteSlider),
        (r"/read-slider", ReadSlider),
        (r"/write-pi-field", WritePiField),
        (r"/read-pi-field", ReadPiField),
        (r"/refresh-record-reader", RefreshRecordReader),
        (r"/raspberry-pi-healthcheck", PiHealthCheck),
        (r"/start-car-service", StartCarService),
        (r"/vehicle-memory", Memory),
        (r"/pi-service-health", PiServiceHealth),
        (r"/stop-service", StopService),
        (r"/initialize-ps3-setup", InitiaizePS3Setup),
        (r"/run-ps3-setup-commands", RunPS3Setup),
        (r"/ps3-controller-health", PS3ControllerHealth),
        (r"/start-sixaxis-loop", PS3ControllerSixAxisStart),
        (r"/is-ps3-connected", IsPS3ControllerConnected),
        (r"/sudo-sixpair", PS3SudoSixPair),
    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8883)
    ap.add_argument(
        "--new_data_path",
        required=False,
        help="Where to store emphasized images",
        default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/emphasis-data/dataset')
    ap.add_argument(
        "--angle_only",
        required=False,
        help="Use angle only model (Y/N)?",
        default='y')
    args = vars(ap.parse_args())
    if 'y' in args['angle_only'].lower():
        args['angle_only'] = True
    else:
        args['angle_only'] = False
    port = args['port']
    app = make_app()
    app.port = port
    app.angle = 0.0
    app.throttle = 0.0
    app.mode = 'user'
    app.recording = False
    app.brake = True
    app.max_throttle = 1.0
    app.new_data_path = args['new_data_path']

    # TODO: Remove this hard-coded path
    app.data_path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data'
    app.model_path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data/tf_visual_data/runs/1'
    app.record_reader = RecordReader(base_directory=app.data_path,overfit=False)
    app.angle_only = args['angle_only']
    # TODO: Remove hard-coded Pi host
    app.pi_host = 'ryanzotti.local'
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
