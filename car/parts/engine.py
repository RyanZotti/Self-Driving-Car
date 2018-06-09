from datetime import datetime
import RPi.GPIO as GPIO


class Engine(object):
    def __init__(self, pinForward, pinBackward, pinControlStraight, pinLeft, pinRight, pinControlSteering,name, inputs):
        """ Initialize the motor with its control pins and start pulse-width
             modulation """
        self.name = name
        self.inputs = inputs
        self.last_update_time = None

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

    def update(self):
        while True:
            self.last_update_time = datetime.now()

    def get_last_update_time(self):
        return self.last_update_time

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

    def run_threaded(self,*args):

        inputs = dict(zip(self.inputs, args))
        mode = inputs['mode']
        assert (mode in ['ai', 'user'])
        if mode == 'ai':
            self.run_angle(inputs['ai/angle'])
            self.run_throttle(inputs['ai/throttle'])
        else:
            self.run_angle(inputs['user/angle'])
            self.run_throttle(inputs['user/throttle'])

    def stop(self):
        self.pwm_forward.ChangeDutyCycle(0)
        self.pwm_backward.ChangeDutyCycle(0)
        self.pwm_left.ChangeDutyCycle(0)
        self.pwm_right.ChangeDutyCycle(0)

    def shutdown(self):
        self.stop()