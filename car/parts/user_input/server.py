import argparse
from concurrent.futures import ThreadPoolExecutor
import tornado.ioloop
import tornado.web
import tornado.gen


class TrackHumanRequests(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def update(self,data):
        data = tornado.escape.json_decode(self.request.body)
        self.application.driver_type = data['driver_type']
        self.application.recording = data['recording']
        self.application.brake = data['brake']
        self.application.max_throttle = data['max_throttle']
        print(data)
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
            'user_input/driver_type': self.application.driver_type,
            'user_input/recording': self.application.recording,
            'user_input/brake': self.application.brake,
            'user_input/max_throttle': self.application.max_throttle
        }
        self.write(state)


def make_app():
    handlers = [
        (r"/track-human-requests", TrackHumanRequests),
        (r"/get-input", GetInput)
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
    app.recording = False
    app.brake = True
    app.max_throttle = 1.0
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
