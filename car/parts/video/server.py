import contextlib
import cv2
import time
import numpy as np
import urllib.request
import tornado.gen
import tornado.ioloop
import tornado.web
import tornado.websocket
from threading import Thread


# This is used to stream video live for the self-driving sessions
# The syntax is super ugly and I don't understand how it works
# This is where I got this code from here, which comes with an explanation:
# https://stackoverflow.com/questions/21702477/how-to-parse-mjpeg-http-stream-from-ip-camera
def live_video_stream(ip):
    # The `with` closes the stream
    # https://stackoverflow.com/questions/1522636/should-i-call-close-after-urllib-urlopen
    with contextlib.closing(urllib.request.urlopen('http://{ip}:8090/test.mjpg'.format(ip=ip))) as stream:

        opencv_bytes = bytes()
        """
        When the video is streaming well, about 1 of every 15
        iterations of this loop produces an image. When the
        video is killed and there is nothing to show, the else
        part of the loop gets called consecutively indefinitely.
        I can avoid the zombie threads that take over my entire
        Tornado server (99% of CPU) if I check a consecutive
        failure count exceeding some arbitrarily high threshold
        """
        count_threshold = 50
        consecutive_no_image_count = 0
        was_available = False
        while True:
            opencv_bytes += stream.read(1024)
            a = opencv_bytes.find(b'\xff\xd8')
            b = opencv_bytes.find(b'\xff\xd9')
            if a != -1 and b != -1:
                jpg = opencv_bytes[a:b + 2]
                opencv_bytes = opencv_bytes[b + 2:]
                frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                if cv2.waitKey(1) == 27:
                    exit(0)
                consecutive_no_image_count = 0
                was_available = True
                yield frame
            else:
                if was_available:
                    consecutive_no_image_count = 1
                else:
                    consecutive_no_image_count += 1
                if consecutive_no_image_count > count_threshold:
                    break
                was_available = False


class VideoAPI(tornado.web.RequestHandler):
    '''
    Serves a MJPEG of the images posted from the vehicle.
    '''

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):

        ioloop = tornado.ioloop.IOLoop.current()
        self.set_header("Content-type", "multipart/x-mixed-replace;boundary=--boundarydonotcross")

        self.served_image_timestamp = time.time()
        my_boundary = "--boundarydonotcross"

        # TODO: Remove this hardcoded URL
        while True:

            interval = .1
            if self.served_image_timestamp + interval < time.time():

                # Can't serve the OpenCV numpy array
                # Tornando: "... only accepts bytes, unicode, and dict objects" (from Tornado error Traceback)
                # The result of cv2.imencode is a tuple like: (True, some_image), but I have no idea what True refers to
                img = cv2.imencode('.jpg', self.application.video_cache.read_cache())[1].tostring()

                # I have no idea what these lines do, but other people seem to use them, they
                # came with this copied code and I don't want to break something by removing
                self.write(my_boundary)
                self.write("Content-type: image/jpeg\r\n")
                self.write("Content-length: %s\r\n\r\n" % len(img))

                # Serve the image
                self.write(img)

                self.served_image_timestamp = time.time()
                yield tornado.gen.Task(self.flush)
            else:
                yield tornado.gen.Task(ioloop.add_timeout, ioloop.time() + interval)


def make_app():
    handlers = [
        (r"/video", VideoAPI),
    ]
    return tornado.web.Application(handlers)

class VideoCache():

    def __init__(self):
        self.frame = None
        self.t = Thread(target=self.write_cache, args=())
        self.t.daemon = True
        self.t.start()

    def write_cache(self):
        for frame in live_video_stream('localhost'):
            self.frame = frame

    def read_cache(self):
        return self.frame


if __name__ == "__main__":
    app = make_app()
    app.video_cache = VideoCache()
    app.listen(8091)
    tornado.ioloop.IOLoop.current().start()
