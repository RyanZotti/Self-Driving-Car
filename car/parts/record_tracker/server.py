import argparse
from concurrent.futures import ThreadPoolExecutor
import cv2
from datetime import datetime
import numpy as np
import tornado.ioloop
import tornado.web
import tornado.gen

from car.parts.record_tracker.datastore import DatasetHandler


class WriteRecord(tornado.web.RequestHandler):

    def post(self):
        print('{timestamp} - Writing a record'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        data = self.application.labels.copy()
        data['camera/image_array'] = self.application.image
        self.application.dataset.put_record(data=data)
        # Clear the cache:
        self.application.image = None
        self.application.labels = None
        self.write({})

# Updates image cache
class ImageCache(tornado.web.RequestHandler):

    def post(self):
        print('{timestamp} - Updating image cache'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        # I don't quite understand how this works. "image" is what
        # I called the key of the dict in the request json but
        # I think "body" is a built-in Tornado thing in the
        # tornado.HTTPFile class. Anyways, it works.
        file_body = self.request.files['image'][0]['body']
        nparr = np.fromstring(file_body, np.uint8)
        self.application.image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        self.write({})

# Updates non-image cache
class RecordCache(tornado.web.RequestHandler):

    def post(self):
        print('{timestamp} - Updating non-image cache'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        json_input = tornado.escape.json_decode(self.request.body)
        self.application.labels = json_input
        self.write({})

def make_app():
    handlers = [
        (r"/write-record", WriteRecord),
        (r"/image", ImageCache),
        (r"/labels", RecordCache)
    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8093
    )
    args = vars(ap.parse_args())
    port = args['port']
    app = make_app()
    dataset_handler = DatasetHandler(path='/datasets')
    input_names = [
        'camera/image_array',
        'user_input/angle',
        'user_input/throttle'
    ],
    input_types = [
        'image_array',
        'float',
        'float'
    ]
    app.image = None
    app.record = None
    dataset = dataset_handler.new_dataset_writer(
        inputs=input_names,
        types=input_types
    )
    dataset.set_name('dataset')
    app.dataset = dataset
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
