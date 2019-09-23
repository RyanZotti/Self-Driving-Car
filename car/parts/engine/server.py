import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import RPi.GPIO as GPIO
import tornado.ioloop
import tornado.web
import tornado.gen


class Engine(object):

    def __init__(self, pinForward, pinBackward, pinControlStraight, pinLeft, pinRight, pinControlSteering):

        self.inputs = None

        GPIO.setmode(GPIO.BOARD)

        self.pinForward = pinForward
        self.pinBackward = pinBackward
        self.pinControlStraight = pinControlStraight
        self.pinLeft = pinLeft
        self.pinRight = pinRight
        self.pinControlSteering = pinControlSteering
        GPIO.setup(self.pinForward, GPIO.OUT)
        GPIO.setup(self.pinBackward, GPIO.OUT)
        GPIO.setup(self.pinControlStraight, GPIO.OUT)

        GPIO.setup(self.pinLeft, GPIO.OUT)
        GPIO.setup(self.pinRight, GPIO.OUT)
        GPIO.setup(self.pinControlSteering, GPIO.OUT)

        self.pwm_forward = GPIO.PWM(self.pinForward, 100)
        self.pwm_backward = GPIO.PWM(self.pinBackward, 100)
        self.pwm_forward.start(0)
        self.pwm_backward.start(0)

        self.pwm_left = GPIO.PWM(self.pinLeft, 100)
        self.pwm_right = GPIO.PWM(self.pinRight, 100)
        self.pwm_left.start(0)
        self.pwm_right.start(0)

        GPIO.output(self.pinControlStraight, GPIO.HIGH)
        GPIO.output(self.pinControlSteering, GPIO.HIGH)

    # PWM only accepts integer values between 0 and 100
    def normalize_input(self,raw_input):

        if raw_input < 0:
            raw_input *= -1

        # Starts between 0.0 and 1.0 so scale by 100
        scaled_input = int(raw_input * 100)

        # Ensure no less than 0 and no greater than 100
        bounded_input = min(max(0,scaled_input),100)

        return bounded_input

    def run_throttle(self, throttle):
        throttle = throttle * self.inputs['max_throttle']
        if throttle > 0:
            pwm_intensity = self.normalize_input(throttle)
            self.pwm_forward.ChangeDutyCycle(pwm_intensity)
            self.pwm_backward.ChangeDutyCycle(0)
        elif throttle < 0:
            pwm_intensity = self.normalize_input(throttle)
            self.pwm_forward.ChangeDutyCycle(0)
            self.pwm_backward.ChangeDutyCycle(pwm_intensity)
        else:
            self.pwm_forward.ChangeDutyCycle(0)
            self.pwm_backward.ChangeDutyCycle(0)

    def run_angle(self, angle):
        if angle > 0:
            pwm_intensity = self.normalize_input(angle)
            self.pwm_left.ChangeDutyCycle(0)
            self.pwm_right.ChangeDutyCycle(pwm_intensity)
        elif angle < 0:
            pwm_intensity = self.normalize_input(angle)
            self.pwm_left.ChangeDutyCycle(pwm_intensity)
            self.pwm_right.ChangeDutyCycle(0)
        else:
            self.pwm_left.ChangeDutyCycle(0)
            self.pwm_right.ChangeDutyCycle(0)

    def run(self, inputs):
        if inputs['vehicle/brake'] is False and inputs['ps3_controller/brake'] is False and inputs['dashboard/brake'] is False:
            driver_type = inputs['dashboard/driver_type']
            assert (driver_type in ['user', 'remote_model', 'local_model'])
            if driver_type == 'remote_model':
                self.run_angle(inputs['remote_model/angle'])
                self.run_throttle(inputs['dashboard/max_throttle'])
            elif driver_type == 'local_model':
                self.run_angle(inputs['remote_model/angle'])
                self.run_throttle(inputs['dashboard/max_throttle'])
            else:
                self.run_angle(inputs['ps3_controller/angle'])
                self.run_throttle(inputs['ps3_controller/throttle'])
        else:
            self.stop()

    def stop(self):
        self.pwm_forward.ChangeDutyCycle(0)
        self.pwm_backward.ChangeDutyCycle(0)
        self.pwm_left.ChangeDutyCycle(0)
        self.pwm_right.ChangeDutyCycle(0)

    def shutdown(self):
        self.stop()
        print('Stopped engine')


class Command(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def run(self, json_input):
        self.application.engine.run(json_input)
        return {}

    @tornado.gen.coroutine
    def post(self):
        print('{timestamp} - Received request'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.run(json_input=json_input)
        self.write(result)

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
        (r"/command", Command),
        (r"/health", Health)
    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8092
    )
    args = vars(ap.parse_args())
    port = args['port']
    app = make_app()
    app.engine = Engine(16, 18, 22, 19, 21, 23)
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
