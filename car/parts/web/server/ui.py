import argparse
import tornado.ioloop
import tornado.web
import tornado.gen


class TrackHumanRequests(tornado.web.RequestHandler):

    def post(self):
        '''
        Receive post requests as user changes the angle
        and throttle of the vehicle on a the index webpage
        '''
        data = tornado.escape.json_decode(self.request.body)
        self.application.user_angle = data['angle']
        self.application.user_throttle = data['throttle']
        self.application.mode = data['drive_mode']
        self.application.recording = data['recording']
        self.application.brake = data['brake']
        self.application.max_throttle = data['max_throttle']


class GetState(tornado.web.RequestHandler):

    def get(self):
        state = {
            'user_angle': self.application.user_angle,
            'user_throttle': self.application.user_throttle,
            'remote_model_angle': self.application.remote_model_angle,
            'remote_model_throttle': self.application.remote_model_throttle,
            'drive_mode': self.application.mode,
            'recording': self.application.recording,
            'brake': self.application.brake,
            'max_throttle': self.application.max_throttle
        }
        self.write(state)


def make_app():
    handlers = [
        (r"/track-human-requests", TrackHumanRequests),
        (r"/get-state", GetState)
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
    app.mode = 'user'
    app.recording = False
    app.brake = True
    app.max_throttle = 1.0
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()