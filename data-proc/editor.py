import argparse
import cv2
import time
import urllib.request
from car.record_reader import RecordReader
import os
from os.path import dirname
import numpy as np
import tornado.gen
import tornado.ioloop
import tornado.web
import requests
import json
from util import *


class Home(tornado.web.RequestHandler):
    def get(self):
        self.render("dist/index.html")


class StateAPI(tornado.web.RequestHandler):

    def get(self):
        state = {
            'angle': self.application.angle,
            'throttle': self.application.throttle,
            'drive_mode': self.application.mode,
            'recording': self.application.recording,
            'brake': self.application.brake,
            'max_throttle': self.application.max_throttle
        }
        self.write(state)


# Makes a copy of record for model to focus on this record
class Keep(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        dataset_name = json_input['dataset']
        record_id = json_input['record_id']
        label_file_name = 'record_{id}.json'.format(id=record_id)
        image_file_name = '{id}_cam-image_array_.png'.format(id=record_id)
        source_directory = os.path.join(
            self.application.data_path,
            dataset_name
        )
        target_directory = os.path.join(
            self.application.data_path_emphasis,
            dataset_name
        )
        if not os.path.exists(target_directory):
            os.makedirs(target_directory)
        source_label_path = os.path.join(source_directory,label_file_name)
        source_image_path = os.path.join(source_directory, image_file_name)
        target_label_path = os.path.join(target_directory,label_file_name)
        target_image_path = os.path.join(target_directory, image_file_name)
        with open(source_label_path, 'r') as f:
            contents = json.load(f)
            contents["cam/image_array"] = image_file_name
        with open(target_label_path, 'w') as fp:
            json.dump(contents, fp)
        copy_image_record = 'cp {source} {destination}'.format(
            source=source_image_path,
            destination=target_image_path
        )
        shell_command(copy_image_record)


class DatasetRecordIdsAPI(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        dataset_name = json_input['dataset']
        dataset_type = json_input['dataset_type']
        if dataset_type.lower() == 'import':
            # TODO: Change to point to real import datasets
            path_id_pairs = self.application.record_reader.get_dataset_record_ids(dataset_name)
        elif dataset_type.lower() == 'review':
            path_id_pairs = self.application.record_reader.get_dataset_record_ids(dataset_name)
        elif dataset_type.lower() == 'mistake':
            path_id_pairs = self.application.record_reader_mistakes.get_dataset_record_ids(dataset_name)
        else:
            print('Unknown dataset_type: '+dataset_type)
        # Comes in list of tuples: (/path/to/record, record_id), but
        # we don't want to show paths to the user b/e it's ugly
        record_ids = []
        for pair in path_id_pairs:
            path, record_id = pair
            record_ids.append(record_id)
        result = {
            'record_ids' : record_ids
        }
        self.write(result)

class IsRecordAlreadyFlagged(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        dataset_name = json_input['dataset']
        record_id = json_input['record_id']
        path_id_pairs = self.application.record_reader_mistakes.get_dataset_record_ids(dataset_name)
        # Comes in list of tuples: (/path/to/record, record_id), but
        # we don't want to show paths to the user b/e it's ugly
        record_ids = []
        for pair in path_id_pairs:
            path, id = pair
            record_ids.append(id)
        result = {
            'is_already_flagged': record_id in record_ids
        }
        self.write(result)

# Given a dataset name and record ID, return the user
# angle and throttle
class UserLabelsAPI(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        dataset_name = json_input['dataset']
        record_id = int(json_input['record_id'])
        label_file_path = self.application.record_reader.get_label_path(
            dataset_name=dataset_name,
            record_id=record_id
        )
        _, angle, throttle = self.application.record_reader.read_record(
            label_path=label_file_path)
        result = {
            'angle' : angle,
            'throttle': throttle
        }
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

    def post(self):

        json_input = tornado.escape.json_decode(self.request.body)
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
        self.write(result)

class DeleteRecord(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
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
        os.remove(label_path)
        os.remove(image_path)


class DeleteFlaggedRecord(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        dataset_name = json_input['dataset']
        record_id = json_input['record_id']
        label_path = self.application.record_reader_mistakes.get_label_path(
            dataset_name=dataset_name,
            record_id=record_id
        )
        image_path = self.application.record_reader_mistakes.get_image_path(
            dataset_name=dataset_name,
            record_id=record_id
        )
        os.remove(label_path)
        os.remove(image_path)
        self.write({})

class ImageCountFromDataset(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
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
            image_count = self.application.record_reader_mistakes.get_image_count_from_dataset(
                dataset_name=dataset_name
            )
        else:
            print('Unknown dataset_type: ' + dataset_type)
        result = {
            'image_count': image_count
        }
        self.write(result)

class DatasetIdFromDataName(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        dataset_name = json_input['dataset']
        dataset_id = self.application.record_reader.get_dataset_id_from_dataset_name(
            dataset_name=dataset_name
        )
        result = {
            'dataset_id': dataset_id
        }
        self.write(result)

class DatasetDateFromDataName(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        dataset_name = json_input['dataset']
        dataset_date = self.application.record_reader.get_dataset_date_from_dataset_name(
            dataset_name=dataset_name
        )
        result = {
            'dataset_date': dataset_date
        }
        self.write(result)

class ListReviewDatasets(tornado.web.RequestHandler):

    def get(self):

        folder_file_paths = self.application.record_reader.folders
        dataset_names = self.application.record_reader.get_dataset_names(folder_file_paths)
        results = {
            'datasets' : dataset_names
        }
        self.write(results)

class ListMistakeDatasets(tornado.web.RequestHandler):

    def get(self):

        folder_file_paths = self.application.record_reader_mistakes.folders
        dataset_names = self.application.record_reader_mistakes.get_dataset_names(folder_file_paths)
        results = {
            'datasets' : dataset_names
        }
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
        (r"/ui-state", StateAPI),
        (r"/dataset-record-ids",DatasetRecordIdsAPI),
        (r"/delete",DeleteRecord),
        (r"/delete-flagged-record", DeleteFlaggedRecord),
        (r"/add-flagged-record", Keep),
        (r"/list-import-datasets", ListReviewDatasets),
        (r"/list-review-datasets", ListReviewDatasets),
        (r"/list-mistake-datasets", ListMistakeDatasets),
        (r"/image-count-from-dataset", ImageCountFromDataset),
        (r"/is-record-already-flagged", IsRecordAlreadyFlagged),
        (r"/dataset-id-from-dataset-name", DatasetIdFromDataName),
        (r"/dataset-date-from-dataset-name", DatasetDateFromDataName),
        (r"/(.*.html)", tornado.web.StaticFileHandler, {"path": html_absolute_path}),
        (r"/assets/(.*)", tornado.web.StaticFileHandler, {"path": assets_absolute_path}),
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
    app.data_path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data'
    app.data_path_emphasis = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper-emphasis/data'
    app.record_reader = RecordReader(base_directory=app.data_path,overfit=False)
    app.record_reader_mistakes = RecordReader(
        base_directory=app.data_path_emphasis,
        overfit=True
    )
    app.angle_only = args['angle_only']

    app.listen(port)
    tornado.ioloop.IOLoop.current().start()