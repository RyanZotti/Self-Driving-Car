from concurrent.futures import ThreadPoolExecutor
from threading import Thread
import tornado.ioloop
import tornado.web
from triangula.input import SixAxis, SixAxisResource


class GetAngleAndThrottle(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_metadata(self):
        result = {
            'user_input/angle' : self.application.angle,
            'user_input/throttle' : self.application.throttle
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        result = yield self.get_metadata()
        self.write(result)


class PS3Controller():

    def __init__(self):
        pass

    # The asyncio library is required to start Tornado as a separate thread
    # https://github.com/tornadoweb/tornado/issues/2308
    def start_microservice(self, port):
        self.microservice = tornado.web.Application([
            (r'/get-angle-and-throttle', GetAngleAndThrottle)
        ])
        self.microservice.listen(port)
        self.microservice.angle = 0.0
        self.microservice.throttle = 0.0
        tornado.ioloop.IOLoop.current().start()

    def start_server(self):
        self.microservice_thread = Thread(target=self.start_microservice, kwargs={'port': 8094})
        self.microservice_thread.daemon = True
        self.microservice_thread.start()

    def start_loop(self):

        with SixAxisResource(bind_defaults=True) as self.joystick:
            # Register a button handler for the square button
            #self.joystick.register_button_handler(handler, SixAxis.BUTTON_SQUARE)
            while True:
                # Read the x and y axes of the left hand stick, the right hand stick has axes 2 and 3
                self.microservice.angle = self.joystick.axes[0].corrected_value()
                self.microservice.throttle = self.joystick.axes[1].corrected_value()
                print(self.microservice.angle, self.microservice.throttle)


ps3_controller = PS3Controller()
ps3_controller.start_server()
ps3_controller.start_loop()
