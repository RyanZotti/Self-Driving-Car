import argparse
from concurrent.futures import ThreadPoolExecutor
import random
import tornado.ioloop
import tornado.web


class GetAngleAndThrottle(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_metadata(self):
        result = {
            'user_input/angle' : random.uniform(-1, 1),
            'user_input/throttle' : random.uniform(-1, 1)
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        result = yield self.get_metadata()
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

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8094)
    args = vars(ap.parse_args())
    port = args['port']
    app = tornado.web.Application([
        (r'/get-angle-and-throttle', GetAngleAndThrottle),
        (r"/health", Health)
    ])
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
