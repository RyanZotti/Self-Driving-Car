import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import tornado.ioloop
import tornado.web
import tornado.gen

from car.parts.record_tracker.datastore import *


class WriteRecord(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def run(self, json_input):
        self.application.engine.inputs = json_input
        self.application.engine.run()
        return {}

    @tornado.gen.coroutine
    def post(self):
        print('{timestamp} - Writing a record'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.run(json_input=json_input)
        self.write(result)

def make_app():
    handlers = [
        (r"/write-record", WriteRecord)
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
    dataset = dataset_handler.new_dataset_writer(
        inputs=input_names,
        types=input_types
    )
    dataset.set_name('dataset')
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
