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
        """
        It's fine to use a hardcoded path because this stub
        should only ever be run through Docker
        """
        static_image_path = '/root/tests/static_image.png'
        self.frame = cv2.imread(static_image_path)

    def read_cache(self):
        return self.frame


if __name__ == "__main__":
    app = make_app()
    app.video_cache = VideoCache()
    app.listen(8091)
    tornado.ioloop.IOLoop.current().start()
