import RPi.GPIO as GPIO
import time
import sys

# I got all code from here:
# http://www.modmypi.com/blog/hc-sr04-ultrasonic-range-sensor-on-the-raspberry-pi



def calculate_distance(ECHO,TRIG):
    # Set output pin to low
    GPIO.output(TRIG, False)

    GPIO.output(TRIG, True)
    time.sleep(0.00001)
    GPIO.output(TRIG, False)

    while GPIO.input(ECHO) == 0:
        pulse_start = time.time()

    while GPIO.input(ECHO) == 1:
        pulse_end = time.time()

    pulse_duration = pulse_end - pulse_start
    distance = pulse_duration * 17150
    distance = round(distance, 2)
    return distance

if __name__ == '__main__':
    GPIO.setmode(GPIO.BCM)
    TRIG = 2
    ECHO = 3
    GPIO.setup(TRIG, GPIO.OUT)
    GPIO.setup(ECHO, GPIO.IN)
    while True:
        try:
            distance = calculate_distance(ECHO,TRIG)
            print("Distance:", distance, "cm")
        except KeyboardInterrupt:
            sys.exit(0)
        except:
            pass

    GPIO.cleanup()