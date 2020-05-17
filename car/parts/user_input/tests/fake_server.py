import argparse
from concurrent.futures import ThreadPoolExecutor
import tornado.ioloop
import tornado.web
import tornado.gen


class GetInput(tornado.web.RequestHandler):

    def get(self):
        state = {
            'user_input/angle': self.application.user_angle,
            'user_input/throttle': self.application.user_throttle,
            'user_input/driver_type': self.application.driver_type,
            'user_input/recording': self.application.recording,
            'user_input/brake': self.application.brake,
            'user_input/max_throttle': self.application.max_throttle
        }
        print(state)
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
    app.user_angle = 0.0
    app.user_throttle = 0.0
    app.remote_model_angle = 0.0
    app.remote_model_throttle = 0.0
    app.driver_type = 'user'
    app.recording = False
    app.brake = True
    app.max_throttle = 1.0
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
