import argparse
from concurrent.futures import ThreadPoolExecutor
import tornado.ioloop
import tornado.web
import tornado.gen


class Input(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def update(self,data):
        print(data)
        self.application.data = data
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.update(data=json_input)
        self.write(result)


class Output(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.gen.coroutine
    def get(self):
        self.write(self.application.data)

class Health(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def is_healthy(self):
        result = {
            'is_healthy': True
        }
        return result

    @tornado.gen.coroutine
    def get(self):
        result = yield self.is_healthy()
        self.write(result)

def make_app():
    handlers = [
        (r"/update", Input),
        (r"/output", Output),
        (r"/health", Health)
    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8095)
    args = vars(ap.parse_args())
    port = args['port']
    app = make_app()
    app.data = {
        'dashboard/brake':None,
        'dashboard/driver_type':None,
        'dashboard/model_constant_throttle':None,
        'local_model/angle':None,
        'local_model/throttle':None,
        'ps3_controller/angle': None,
        'ps3_controller/brake': None,
        'ps3_controller/new_dataset': None,
        'ps3_controller/recording': None,
        'ps3_controller/throttle': None,
        'remote_model/angle':None,
        'remote_model/throttle':None,
        'vehicle/brake':None
    }
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
