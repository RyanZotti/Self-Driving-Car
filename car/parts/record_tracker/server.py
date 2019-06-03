import argparse
from concurrent.futures import ThreadPoolExecutor
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
    dataset_handler = DatasetHandler(path='/root/data')
    recorded_inputs = [
        'cam/image_array',
        'user/angle',
        'user/throttle',
        'ai/angle',
        'ai/throttle',
        'mode',
        'system-brake',
        'user-brake',
        'ai/healthcheck',
        'max_throttle']
    types = [
        'image_array',
        'float',
        'float',
        'float',
        'float',
        'str',
        'boolean',
        'boolean',
        'str',
        'float'
    ]
    dataset = dataset_handler.new_dataset_writer(
        inputs=recorded_inputs,
        types=types
    )
    dataset.set_name('dataset')
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
