import RPi.GPIO as GPIO


class Engine(object):

    def __init__(self):

        GPIO.setmode(GPIO.BOARD)

        super().__init__()

        # TODO: Read host from config file
        self.ffmpeg_host = ffmpeg_host

        stream_url = 'http://{ffmpeg_host}/webcam.mjpeg'.format(ffmpeg_host=ffmpeg_host)
        self.stream = urllib.request.urlopen(stream_url)
        self.opencv_bytes = bytes()

        # initialize variable used to indicate
        # if the thread should be stopped
        self.frame = None
        self.on = True

        print('WebcamVideoStream loaded.. .warming camera')

    def update(self):
        while self.on:

            self.opencv_bytes += self.stream.read(1024)
            a = self.opencv_bytes.find(b'\xff\xd8')
            b = self.opencv_bytes.find(b'\xff\xd9')
            if a != -1 and b != -1:
                jpg = self.opencv_bytes[a:b + 2]
                self.opencv_bytes = self.opencv_bytes[b + 2:]
                frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                if cv2.waitKey(1) == 27:
                    exit(0)
                self.frame = frame

    def run_threaded(self):
        return self.frame

    # TODO: Turn off all motors
    def shutdown(self):
        pass