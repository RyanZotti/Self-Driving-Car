import RPi.GPIO as GPIO


class Engine(object):
    def __init__(self, pinForward, pinBackward, pinControlStraight, pinLeft, pinRight, pinControlSteering, **kwargs):
        """ Initialize the motor with its control pins and start pulse-width
             modulation """

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
        pass

    # PWM only accepts integer values between 0 and 100
    def normalize_input(self,raw_input):

        if raw_input < 0:
            raw_input *= -1

        # Starts between 0.0 and 1.0 so scale by 100
        scaled_input = int(raw_input * 100)

        # Ensure no less than 0 and no greater than 100
        bounded_input = min(max(0,scaled_input),100)

        return bounded_input

    def run_threaded(self,*args):

        commands = dict(zip(self.inputs, args))

        if commands['user/angle'] > 0:
            pwm_intensity = self.normalize_input(commands['user/angle'])
            self.pwm_left.ChangeDutyCycle(0)
            self.pwm_right.ChangeDutyCycle(pwm_intensity)
        elif commands['user/angle'] < 0:
            pwm_intensity = self.normalize_input(commands['user/angle'])
            self.pwm_left.ChangeDutyCycle(pwm_intensity)
            self.pwm_right.ChangeDutyCycle(0)
        else:
            self.pwm_left.ChangeDutyCycle(0)
            self.pwm_right.ChangeDutyCycle(0)

        if commands['user/throttle'] > 0:
            pwm_intensity = self.normalize_input(commands['user/throttle'])
            self.pwm_forward.ChangeDutyCycle(pwm_intensity)
            self.pwm_backward.ChangeDutyCycle(0)
        elif commands['user/throttle'] < 0:
            pwm_intensity = self.normalize_input(commands['user/throttle'])
            self.pwm_forward.ChangeDutyCycle(0)
            self.pwm_backward.ChangeDutyCycle(pwm_intensity)
        else:
            self.pwm_forward.ChangeDutyCycle(0)
            self.pwm_backward.ChangeDutyCycle(0)

    # Turns off all motors
    def shutdown(self):
        self.pwm_forward.ChangeDutyCycle(0)
        self.pwm_backward.ChangeDutyCycle(0)
        self.pwm_left.ChangeDutyCycle(0)
        self.pwm_right.ChangeDutyCycle(0)