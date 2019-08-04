import argparse
from concurrent.futures import ThreadPoolExecutor
import pexpect
import subprocess
from threading import Thread
import time
import tornado.ioloop
import tornado.web
import tornado.concurrent
import traceback
from triangula.input import SixAxis, SixAxisResource


class BluetoothctlError(Exception):
    """This exception is raised when bluetoothctl fails to start."""
    pass


class Bluetoothctl:
    """
    A wrapper for bluetoothctl utility.
    Got this code from here: https://gist.github.com/egorf/66d88056a9d703928f93
    """

    def __init__(self):
        self.child = pexpect.spawn("bluetoothctl", echo = False)

    def get_output(self, command, pause = 0):
        """Run a command in bluetoothctl prompt, return output as a list of lines."""
        self.child.send(command + "\n")
        time.sleep(pause)
        start_failed = self.child.expect(["bluetooth", pexpect.EOF])

        if start_failed:
            raise BluetoothctlError("Bluetoothctl failed after running " + command)

        return self.child.before.split("\r\n")

    def start_scan(self):
        """Start bluetooth scanning process."""
        try:
            out = self.get_output("scan on")
        except:
            traceback.print_exc()
            return None

    def make_discoverable(self):
        """Make device discoverable."""
        try:
            out = self.get_output("discoverable on")
        except:
            traceback.print_exc()
            return None

    def parse_device_info(self, info_string):
        """Parse a string corresponding to a device."""
        device = {}
        block_list = ["[\x1b[0;", "removed"]
        string_valid = not any(keyword in info_string for keyword in block_list)

        if string_valid:
            try:
                device_position = info_string.index("Device")
            except ValueError:
                pass
            else:
                if device_position > -1:
                    attribute_list = info_string[device_position:].split(" ", 2)
                    device = {
                        "mac_address": attribute_list[1],
                        "name": attribute_list[2]
                    }

        return device

    def get_available_devices(self):
        """Return a list of tuples of paired and discoverable devices."""
        try:
            out = self.get_output("devices")
        except:
            traceback.print_exc()
            return None
        else:
            available_devices = []
            for line in out:
                device = self.parse_device_info(line)
                if device:
                    available_devices.append(device)

            return available_devices

    def get_paired_devices(self):
        """Return a list of tuples of paired devices."""
        try:
            out = self.get_output("paired-devices")
        except:
            traceback.print_exc()
            return None
        else:
            paired_devices = []
            for line in out:
                device = self.parse_device_info(line)
                if device:
                    paired_devices.append(device)

            return paired_devices

    def get_discoverable_devices(self):
        """Filter paired devices out of available."""
        available = self.get_available_devices()
        paired = self.get_paired_devices()

        return [d for d in available if d not in paired]

    def get_device_info(self, mac_address):
        """Get device info by mac address."""
        try:
            out = self.get_output("info " + mac_address)
        except:
            traceback.print_exc()
            return None
        else:
            return out

    def register(self, mac_address):
        """Try to pair with a device by mac address."""
        try:
            out = subprocess.check_output("sudo ./sixpair", shell=True)
            out = self.get_output("agent on")
            result_0 = self.child.expect(["Agent registered", pexpect.EOF])
            out = self.get_output("trust " + mac_address)
            result_1 = self.child.expect(["trust succeeded", pexpect.EOF])
        except:
            traceback.print_exc()
            return None
        else:
            # Checks the result against the position of expected items
            # The we care about is in position 0
            success = True if result_1 == 0 else False
            return success

    def remove(self, mac_address):
        """Remove paired device by mac address, return success of the operation."""
        try:
            out = self.get_output("remove " + mac_address, 3)
        except:
            traceback.print_exc()
            return None
        else:
            res = self.child.expect(["not available", "Device has been removed", pexpect.EOF])
            success = True if res == 1 else False
            return success

    def connect(self, mac_address):
        """Try to connect to a device by mac address."""
        try:
            out = self.get_output("connect " + mac_address, 2)
        except:
            traceback.print_exc()
            return None
        else:
            res = self.child.expect(["Failed to connect", "Connection successful", pexpect.EOF])
            success = True if res == 1 else False
            return success

    def disconnect(self, mac_address):
        """Try to disconnect to a device by mac address."""
        try:
            out = self.get_output("disconnect " + mac_address, 2)
        except:
            traceback.print_exc()
            return None
        else:
            res = self.child.expect(["Failed to disconnect", "Successful disconnected", pexpect.EOF])
            success = True if res == 1 else False
            return success

    def is_wired(self):
        devices = self.get_discoverable_devices()
        is_discovered = False
        for device in devices:
            if 'playstation' in device['name'].lower():
                is_discovered = True
                break
        return is_discovered

    def get_playstation_mac_address(self):
        devices = self.get_discoverable_devices()
        mac_address = None
        for device in devices:
            if 'playstation' in device['name'].lower():
                mac_address = device['mac_address']
                break
        return mac_address

class RunSetupCommands(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def run_commands(self):
        mac_address = self.application.bluetoothctl.get_playstation_mac_address()
        is_complete = self.application.bluetoothctl.register(mac_address=mac_address)
        return {'is_complete':is_complete}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.run_commands()
        self.write(result)

class IsConnected(tornado.web.RequestHandler):

    """
    js0 will show up either when the PS3 controller is plugged
    in or when it is successfully connected over bluethooth,
    though it might not show up if it has been plugged in for
    awhile without being used. In this case you just need to
    unplug it and plug it in again.

    The caller of this class first checks for a connection,
    which is assumed to be wired. If the connection exists, then
    some registration commands are run. Then the caller checks
    that the user has disconnected. Then the caller checks that
    the connection exists after the user has hit the PS button,
    so effectively this class will get called at least three
    times during the pairing workflow
    """

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def run_command(self):
        out = subprocess.check_output("ls /dev/input", shell=True).split('\n')
        if 'js0' in out:
            return {'is_connected':True}
        else:
            return {'is_connected': False}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.run_command()
        self.write(result)

class StartSixAxisLoop(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def start_loop(self):
        self.application.ps3_controller.start_loop()
        return {'is_healthy':self.application.ps3_controller.is_loop_on}

    @tornado.gen.coroutine
    def post(self):
        if not self.application.ps3_controller.is_loop_on:
             result = yield self.start_loop()
             self.write(result)
        else:
            self.write({'is_healthy':self.application.ps3_controller.is_loop_on})

class GetAngleAndThrottle(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_metadata(self):
        result = {
            'user_input/angle' : self.application.ps3_controller.angle,
            'user_input/throttle' : self.application.ps3_controller.throttle
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


class PS3Health(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def is_healthy(self):
        result = {
            'is_healthy': self.application.ps3_controller.is_loop_on
        }
        return result

    @tornado.gen.coroutine
    def get(self):
        result = yield self.is_healthy()
        self.write(result)

class PS3Controller():

    def __init__(self):
        self.bluetoothctl = Bluetoothctl()
        self.angle = 0.0
        self.throttle = 0.0
        self.is_loop_on = False

    def loop(self):
        with SixAxisResource(bind_defaults=True) as self.joystick:
            # Register a button handler for the square button
            # self.joystick.register_button_handler(handler, SixAxis.BUTTON_SQUARE)
            try:
                while True:
                    # Read the x and y axes of the left hand stick, the right hand stick has axes 2 and 3
                    self.angle = self.joystick.axes[0].corrected_value()
                    self.throttle = self.joystick.axes[1].corrected_value()
                    print(self.angle, self.throttle)
                    self.is_loop_on = True
            except:
                self.is_loop_on = False

    def start_loop(self):
        self.ps3_controller_thread = Thread(target=self.loop)
        self.ps3_controller_thread.daemon = False
        self.ps3_controller_thread.start()

def make_app():
    handlers = [
        (r'/get-angle-and-throttle', GetAngleAndThrottle),
        (r"/health", Health),
        (r"/ps3-health", PS3Health),
        (r"/run-setup-commands", RunSetupCommands),
        (r"/is-connected", IsConnected),
        (r"/start-sixaxis-loop", StartSixAxisLoop)
    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8094)
    args = vars(ap.parse_args())
    port = args['port']

    app = make_app()
    app.listen(port)
    app.ps3_controller = PS3Controller()
    app.bluetoothctl = Bluetoothctl()
    app.sixaxis_thread = None
    app.is_sixaxis_loop_on = False
    tornado.ioloop.IOLoop.current().start()

