from tornado import gen
import argparse
import cv2
from datetime import datetime
import time
import urllib.request
from ai.record_reader import RecordReader
import os
from os.path import dirname
import numpy as np
import tornado.gen
import tornado.ioloop
import tornado.web
import tornado.websocket
import requests
import json
import signal
from coordinator.utilities import *
import json
import traceback
from concurrent.futures import ThreadPoolExecutor
from data_augmentation import pseduo_crop, show_resize_effect


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
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def send_drive_state(self, json_input):
        is_recording = json_input['recording']
        if is_recording == True:
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
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.send_drive_state(json_input=json_input)
        self.write(result)


class LaptopModelDeploymentHealth(tornado.web.RequestHandler):
    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_laptop_model_deploy_health(self):
        seconds = 1
        try:
            request = requests.post(
                'http://localhost:8885/health-check',
                timeout=seconds
            )
            response = json.loads(request.text)
            return response
        except:
            return {'process_id': -1}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.get_laptop_model_deploy_health()
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
    def deploy_model(self):

        # TODO: Don't hardcode checkpoint_directory. Get from DB
        checkpoint_directory = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data/tf_visual_data/runs/1/checkpoints'
        # TODO: Don't hardcode any of these things
        port = 8885
        image_scale = 0.125
        angle_only = 'y'
        crop_factor = 2

        # Kill any currently running model API
        try:
            process = subprocess.Popen(
                'docker rm -f laptop-predict',
                shell=True
            )
        except:
            pass # Most likely means API is not up

        # TODO: Remove hard-coded model ID
        model_id = 1
        sql_query = """
            SELECT
              max(epoch) AS epoch
            FROM epochs
            WHERE model_id = {model_id}
        """.format(
            model_id=model_id
        )
        epoch = get_sql_rows(sql_query)[0]['epoch']
        command_list = [
            'docker',
            'run',
            '-i',
            '-d',
            '-t',
            '-p',
            str(port)+':8885',
            '--volume',
            checkpoint_directory+':/root/ai/model-archives/model/checkpoints',
            '--name',
            'laptop-predict',
            'ryanzotti/ai-laptop:latest',
            'python',
            '/root/ai/microservices/predict.py',
            '--port',
            str(port),
            '--image_scale',
            str(image_scale),
            '--angle_only',
            angle_only,
            '--crop_factor',
            str(crop_factor),
            '--model_id',
            str(model_id),
            '--epoch',
            str(epoch)
        ]
        process = subprocess.Popen(
            args=command_list,
            shell=False
        )
        result = {}
        return result

    @tornado.gen.coroutine
    def post(self):
        result = yield self.deploy_model()
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
        crop_factor_args = self.get_arguments(name="crop-factor")
        if len(crop_factor_args) > 0:
            crop_factor = int(crop_factor_args[0])
            frame = pseduo_crop(
                image=frame,
                crop_factor=crop_factor,
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

        ioloop = tornado.ioloop.IOLoop.current()
        self.set_header("Content-type", "multipart/x-mixed-replace;boundary=--boundarydonotcross")

        self.served_image_timestamp = time.time()
        my_boundary = "--boundarydonotcross"

        # TODO: Remove this hardcoded URL
        for frame in live_video_stream('ryanzotti.local',port=8091):

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


class StartCar(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def start_car(self):
        # TODO: Remove this hardcoded path
        command = 'export PYTHONPATH=$PYTHONPATH:/home/pi/Self-Driving-Car && cd ~/Self-Driving-Car && python3 /home/pi/Self-Driving-Car/car/start.py > /home/pi/Self-Driving-Car/start-logs.txt 2>&1 &'
        execute_pi_command(
            command=command
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.start_car()
        self.write(result)

class StartCarVideo(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def start_car_video(self):

        # Got the ffmpeg and ffmserver setup instructions from here:
        # https://www.hackster.io/whitebank/rasbperry-pi-ffmpeg-install-and-stream-to-web-389c34
        # Start ffmserver and ffmpeg
        # nohup keeps PID from getting killed after logout
        """
        Regarding errors ffmpeg errors like: "/dev/video0: Device or resource busy":
        There doesn't seem to be a solution, so I'll just tell code to keep trying
        until it succeeds. The loop code exists in a shell script I created called
        start_ffmpeg.sh
        - https://github.com/moritzmhmk/homebridge-camera-rpi/issues/30
        - https://github.com/KhaosT/homebridge-camera-ffmpeg/issues/163
        - https://stackoverflow.com/questions/5274294/how-can-you-run-a-command-in-bash-over-until-success
        """
        command = 'docker run -t -d -i --device=/dev/video0 --network host --name ffmpeg ryanzotti/ffmpeg:latest'
        execute_pi_command(
            command=command, is_printable=True
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.start_car_video()
        self.write(result)

class StopCarVideo(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def stop_ffmpeg(self):
        command_ffmpeg = "docker rm -f ffmpeg"
        execute_pi_command(
            command=command_ffmpeg
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.stop_ffmpeg()
        self.write(result)


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
        is_able_to_connect = False
        try:
            command = 'ls -ltr'
            execute_pi_command(
                command=command
            )
            is_able_to_connect = True
        except:
            pass
        return {
            'is_able_to_connect':is_able_to_connect
        }

    @tornado.gen.coroutine
    def post(self):
        result = yield self.health_check()
        self.write(result)


class ResumeTraining(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def resume_training(self):
        resume_training(
            data_path=self.application.data_path,
            model_dir=self.application.model_path
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.resume_training()
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
    def train_new_model(self):
        train_new_model(
            data_path=self.application.data_path
        )
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.train_new_model()
        self.write(result)


class IsTraining(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def is_training(self):
        return {'is_running':is_training()}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.is_training()
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
        # TODO: Remove hardcoded port
        request = requests.post(
            'http://localhost:8885/model-meta-data'
        )
        response = json.loads(request.text)
        model_id = response['model_id']
        epoch = response['epoch']
        sql_query = '''
            SELECT
              epochs.epoch,
              epochs.train,
              epochs.validation
            FROM epochs
            WHERE epochs.epoch > COALESCE(epoch,0)
              AND epochs.model_id = {model_id}
            ORDER BY epochs.epoch ASC;
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
        sql_query = '''
            SELECT
              model_id,
              epoch
            FROM predictions
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%')
            ORDER BY created_timestamp DESC
            LIMIT 1
            '''.format(
            dataset=dataset
        )
        rows = get_sql_rows(sql=sql_query)
        if len(rows) > 0:
            first_row = rows[0]
            return first_row
        else:
            return None


    @tornado.concurrent.run_on_executor
    def get_error_metrics(self,json_inputs):
        dataset_name = json_inputs['dataset']
        latest_deployment = self.get_latest_deployment(dataset=dataset_name)
        if latest_deployment is not None:
            model_id = latest_deployment['model_id']
            epoch = latest_deployment['epoch']
            sql_query = '''
                SELECT
                  SUM(CASE WHEN ABS(records.angle - predictions.angle) >= 0.8
                    THEN 1 ELSE 0 END) AS critical_count,
                  AVG(CASE WHEN ABS(records.angle - predictions.angle) >= 0.8
                    THEN 100.0 ELSE 0.0 END)::FLOAT AS critical_percent,
                  AVG(ABS(records.angle - predictions.angle)) AS avg_abs_error
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
        (r"/start-car-video", StartCarVideo),
        (r"/stop-car-video", StopCarVideo),
        (r"/video-health-check", VideoHealthCheck),
        (r"/update-drive-state", UpdateDriveState),
        (r"/dataset-record-ids",DatasetRecordIdsAPI),
        (r"/dataset-record-ids-filesystem", DatasetRecordIdsAPIFileSystem),
        (r"/laptop-model-api-health", LaptopModelDeploymentHealth),
        (r"/delete",DeleteRecord),
        (r"/delete-dataset", DeleteDataset),
        (r"/save-reocord-to-db", SaveRecordToDB),
        (r"/delete-flagged-record", DeleteFlaggedRecord),
        (r"/delete-flagged-dataset", DeleteFlaggedDataset),
        (r"/add-flagged-record", Keep),
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
        (r"/deploy-laptop-model", DeployModel),
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
        (r"/start-car", StartCar),
        (r"/write-pi-field", WritePiField),
        (r"/read-pi-field", ReadPiField),
        (r"/raspberry-pi-healthcheck", PiHealthCheck),
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
