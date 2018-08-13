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


class DriveAPI(tornado.web.RequestHandler):

    def get(self):
        data = {}
        self.render("templates/editor_standalone.html", **data)

    def post(self):
        '''
        Receive post requests as user changes the angle
        and throttle of the vehicle on a the index webpage
        '''
        data = tornado.escape.json_decode(self.request.body)
        self.application.angle = data['angle']
        self.application.throttle = data['throttle']
        self.application.mode = data['drive_mode']
        self.application.recording = data['recording']
        self.application.brake = data['brake']
        self.application.max_throttle = data['max_throttle']


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
        dataset = re.search(r'(?<=data/)(.*)(?=/record)', self.application.label_path).group(1)

        # TODO: Replace ugly file name hack with os package
        label_file_name = self.application.label_path.split('/')[-1]
        image_file_name = self.application.image_path.split('/')[-1]

        directory = os.path.join(app.data_path_emphasis,dataset)
        if not os.path.exists(directory):
            os.makedirs(directory)
        new_label_path = os.path.join(directory,label_file_name)
        new_image_path = os.path.join(directory, image_file_name)

        with open(self.application.label_path, 'r') as f:
            contents = json.load(f)
            contents["cam/image_array"] = image_file_name
        print(new_label_path)
        with open(new_label_path, 'w') as fp:
            json.dump(contents, fp)

        copy_image_record = 'cp {source} {destination}'.format(
            source=self.application.image_path,
            destination=new_image_path
        )
        shell_command(copy_image_record)


class DatasetRecordIdsAPI(tornado.web.RequestHandler):

    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        dataset_name = json_input['dataset']
        path_id_pairs = self.application.record_reader.get_dataset_record_ids(dataset_name)

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


class MetadataAPI(tornado.web.RequestHandler):

    def post(self):

        self.application.label_path, file_number = next(app.all_files)
        self.application.image_path = self.application.record_reader.image_path_from_label_path(self.application.label_path)
        highest_index = app.record_reader.ordered_label_files(dirname(self.application.image_path))[-1][1]
        message = '{index}/{total}: path:{path}'.format(
            index=file_number,
            total=highest_index,
            path=self.application.image_path
        )
        print(message)
        _, angle, throttle = self.application.record_reader.read_record(label_path=self.application.label_path)

        # Read image from disk
        img_arr = cv2.imread(self.application.image_path)
        self.application.image = img_arr
        img = cv2.imencode('.jpg', img_arr)[1].tostring()
        files = {'image': img}
        # TODO: Remove hard-coded model API
        request = requests.post('http://localhost:8885/predict', files=files)
        response = json.loads(request.text)
        prediction = response['prediction']
        if self.application.angle_only == True:
            predicted_angle = prediction[0]
            result = {
                'ai': {
                    'angle': predicted_angle,
                    'throttle': 0.4},
                'user': {
                    'angle': angle,
                    'throttle': throttle},
                'dataset': {
                    'file_number': file_number,
                    'highest_index': highest_index
                }
            }
        else:
            predicted_angle, predicted_throttle = prediction
            result = {
                'ai': {
                    'angle': predicted_angle,
                    'throttle': predicted_throttle},
                'user': {
                    'angle': angle,
                    'throttle': throttle},
                'dataset': {
                    'file_number': file_number,
                    'highest_index': highest_index
                }
            }
        self.write(result)

class DeleteRecord(tornado.web.RequestHandler):

    def post(self):
        os.remove(self.application.label_path)
        os.remove(self.application.image_path)


class ListDatasets(tornado.web.RequestHandler):

    def get(self):

        folder_file_paths = self.application.record_reader.folders
        dataset_names = self.application.record_reader.get_dataset_names(folder_file_paths)
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
    static_file_path = os.path.join(this_dir, 'templates', 'static')
    handlers = [
        (r"/", tornado.web.RedirectHandler, dict(url="/drive")),
        (r"/drive", DriveAPI),
        (r"/metadata", MetadataAPI),
        (r"/image", ImageAPI),
        (r"/ui-state", StateAPI),
        (r"/dataset-record-ids",DatasetRecordIdsAPI),
        (r"/delete",DeleteRecord),
        (r"/keep", Keep),
        (r"/list-datasets",ListDatasets),
        (r"/static/(.*)", tornado.web.StaticFileHandler, {"path": static_file_path}),
    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8884)
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
    app.all_files = iter(app.record_reader.all_ordered_label_files())
    app.angle_only = args['angle_only']

    app.listen(port)
    tornado.ioloop.IOLoop.current().start()