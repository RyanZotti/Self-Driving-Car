import argparse
from concurrent.futures import ThreadPoolExecutor
import tornado.ioloop
import tornado.web
import tornado.gen


class Input(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def update(self,data):
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


def make_app():
    handlers = [
        (r"/update", Input),
        (r"/output", Output)
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
        'local_model/angle':None,
        'local_model/throttle':None,
        'remote_model/angle':None,
        'remote_model/throttle':None,
        'user_input/angle':None,
        'user_input/brake':None,
        'user_input/driver_type':None,
        'user_input/max_throttle':None,
        'user_input/recording':None,
        'user_input/throttle':None,
        'vehicle/brake':None
    }
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
