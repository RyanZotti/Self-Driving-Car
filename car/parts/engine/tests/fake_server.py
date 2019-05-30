import argparse
from concurrent.futures import ThreadPoolExecutor
import tornado.ioloop
import tornado.web
import tornado.gen


class Command(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def run(self, json_input):
        return {}

    @tornado.gen.coroutine
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        result = yield self.run(json_input=json_input)
        self.write(result)

def make_app():
    handlers = [
        (r"/command", Command)
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
    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
