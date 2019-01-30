from tornado import gen
import argparse
import cv2
import time
import urllib.request
from car.record_reader import RecordReader
import os
from os.path import dirname
import numpy as np
import tornado.gen
import tornado.ioloop
import tornado.web
import tornado.websocket
import requests
import json
import signal
from util import *
import json
import traceback
from concurrent.futures import ThreadPoolExecutor
from data_augmentation import pseduo_crop
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
        self.frame = None
        self.t = Thread(target=self.write_cache, args=())
        self.t.daemon = True
        self.t.start()

    def write_cache(self):
        for frame in live_video_stream('ryanzotti.local'):
            self.frame = frame

    def read_cache(self):
        return self.frame


if __name__ == "__main__":
    app = make_app()
    # TODO: Remove this hard-coded path
    app.video_cache = VideoCache()
    app.listen(8881)
    tornado.ioloop.IOLoop.current().start()
