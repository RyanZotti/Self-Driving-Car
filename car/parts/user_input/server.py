import argparse
from concurrent.futures import ThreadPoolExecutor
import tornado.ioloop
import tornado.web
import tornado.gen


class TrackHumanRequests(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def update(self,data):
        print(data)
        self.application.driver_type = data['dashboard/driver_type']
        self.application.brake = data['dashboard/brake']
        self.application.model_constant_throttle = data['dashboard/model_constant_throttle']
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.update(data=json_input)
        self.write(result)


class GetInput(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.gen.coroutine
    def get(self):
        state = {
            'dashboard/driver_type': self.application.driver_type,
            'dashboard/brake': self.application.brake,
            'dashboard/model_constant_throttle': self.application.model_constant_throttle
        }
        self.write(state)

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
        (r"/track-human-requests", TrackHumanRequests),
        (r"/get-input", GetInput),
        (r"/health", Health)
    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8884)
    args = vars(ap.parse_args())
    port = args['port']
    app = make_app()
    app.remote_model_angle = 0.0
    app.remote_model_throttle = 0.0
    app.driver_type = 'user'
    app.brake = True
    app.model_constant_throttle = 1.0
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
