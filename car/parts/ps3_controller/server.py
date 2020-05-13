import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import pexpect
import re
import requests
import subprocess
from threading import Thread
import time
import tornado.ioloop
import tornado.web
import tornado.concurrent
import traceback
from triangula_fork import SixAxis, SixAxisResource

"""
Docs for understanding the pexpect module:
https://pexpect.readthedocs.io/en/stable/overview.html
"""


class Bluetoothctl:

    def __init__(self):
        self.child = pexpect.spawn('bluetoothctl')
        """
        For some reason starting bluetoothctl in pexpect returns
        the text 'Waiting to connect to bluetoothd...', but you
        don't get that when you type that manually.
        """

    def match_everything(self):
        """
        I have no idea why I can't just run '.*', but I tested
        '.' and then '.*' and I always had to use both to match
        all stdout. Note that this will fail if there is no
        stdout.

        Timeout of 0 means return whatever I have now, and
        if nothing exists then fail immediately. I assume
        that if I actually care about waiting for additional
        stdout to accumulate that I perform the wait outside
        of this function.
        """
        try:
            self.child.expect('.', timeout=0.0)
            self.child.expect('.*', timeout=0.0)
        except:
            pass

    def run(self, command, wait_seconds=0.2):
        """
        Run a command and return the output.

        When you send a command to pexpect and then "expect" a
        specific regex result, you can access the stdout before
        and after the regex match using the "before" and "after"
        property of the child process. Unfortunately this seems
        to be the only way to get stdout from pexpect. It would
        be great if you could get it from child.stdout, but that
        doesn't seem to exist. All of the examples I saw on
        Stack Overflow used the before and after property to get
        stdout. This means you have to write some hacky code even
        if all you want to do is run a command to see its output.
        That's why I wrote this function -- to make it easy to
        get output and to document how my hack works.

        Parameters
        ----------
        command : string
            The command you want to run

        Returns
        ----------
        stdout : list<string>
            The results of your command
        """

        """
        One important thing to note about pexpect is that it seems
        to keep all stdout that occurred after the most recent last
        match. So if a bunch of previous commands' stdout contain
        "bluetooth" and you didn't bother to run pexpect.match([...]),
        you'll match on the first occurrence, even if that's long
        before you issued the command you care about. This can
        happen if you run commands outside of self.run() or if you
        have timeouts or other errors that add stdout clutter. So
        when I care about the output I clear out all previous
        stdout by matching on everything before I run the command of
        interest. And I have no idea why, but I need to run "."
        before I can run ".*", but I tested it repeatedly and that
        was how I had to do it to clear about the old stdout.

        My match_everything() function discards the first space, so
        I send a blank command, which does nothing, to ensure that
        I don't lose any of the characters from the command I
        actually care about. Also, if you're debugging this class
        manually it makes the printed stdout look clean.
        """
        self.match_everything()
        self.child.sendline('')

        # Run the command
        self.child.sendline(command)
        """
        Normally in files newlines are represented as \n, but for
        some complicated historical reasons that have to do with how
        the linux command line works, prompt-based new lines are
        represented as \r\n. The pexpect docs talk about this a bit,
        but I don't have the exact link at the moment.

        This is regex text that optionally checks for the blue colored
        text of the bluetoothctl command prompt.
        - Text: \x1b[0m
          Meaning: Reset all color attributes
        - Text: \x1b[0;94m
          Meaning: the color blue

        See these sources for more details on color codes:
        - http://jafrog.com/2013/11/23/colors-in-terminal.html
        - https://bixense.com/clicolors/

        See this source for an explanation of regex:
        - https://regex101.com/
        """
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        self.match_everything()
        stdout = self.child.after
        print(stdout)
        """
        Sometimes pexpect's child won't return a string but a timeout
        class, so I need to check stdout type before trying to
        perform a split
        """
        if isinstance(stdout, str):
            return stdout.split("\r\n")
        return stdout

    def get_all_ps3_mac_addresses(self):
        devices_stdout_list = self.run('devices')
        devices_stdout_str = ' '.join(devices_stdout_list)
        mac_addresses = re.findall(
            '(?<=Device[\s]).{17}(?=[\s]PLAYSTATION)',
            devices_stdout_str
        )
        return mac_addresses

    def remove_all_ps3_controllers(self):
        mac_addresses = self.get_all_ps3_mac_addresses()
        for mac_address in mac_addresses:
            self.run('remove {mac_address}'.format(
                mac_address=mac_address)
            )

    def register_ps3_device(self):
        mac_addresses = self.get_all_ps3_mac_addresses()
        """
        I assume that you will only ever see one PS3 controller
        MAC address because on server startup I run
        remove_all_ps3_controllers() to ensure there aren't any
        mix-ups.
        """
        mac_address = mac_addresses[0]
        _ = self.run('agent on')
        _ = self.run('trust {mac_address}'.format(
            mac_address=mac_address
        ))

class RunSetupCommands(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def run_commands(self):
        self.application.bluetoothctl.register_ps3_device()
        return {}

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

class GetState(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    # TODO: Don't hardcode these
    def translate_buttons(self):
        """
        Takes a list of buttons and returns a dictionary of
        states. Assumes that if there are no unacknowledged
        buttons that the new state will be the same as the
        previous state. If there are any unacknowledged buttons
        then they will be cleared out (marked as acknowledged
        after the function is called).
        """

        """
        I have to use different buttons for the same on/off
        setting because there is no visual feedback (e.g., a
        screen) on the PS3 controller to indicate the current
        state
        """
        # TODO: Put these in a DB or set at startup via the CLI
        mapping = {
            'ps3_controller/recording:ON': 'BUTTON_TRIANGLE',
            'ps3_controller/recording:OFF': 'BUTTON_SQUARE',
            'ps3_controller/brake:ON': 'BUTTON_CROSS',
            'ps3_controller/brake:OFF': 'BUTTON_CIRCLE',
            'ps3_controller/new_dataset': 'BUTTON_D_UP'
        }

        previous_state = self.application.button_states

        new_state = {}
        if mapping['ps3_controller/recording:ON'] in self.application.ps3_controller.pressed_buttons and \
                mapping['ps3_controller/recording:OFF'] not in self.application.ps3_controller.pressed_buttons:
            new_state['ps3_controller/recording'] = True
        elif mapping['ps3_controller/recording:OFF'] in self.application.ps3_controller.pressed_buttons and \
                mapping['ps3_controller/recording:ON'] not in self.application.ps3_controller.pressed_buttons:
            new_state['ps3_controller/recording'] = False
        else:
            new_state['ps3_controller/recording'] = previous_state['ps3_controller/recording']

        if mapping['ps3_controller/brake:ON'] in self.application.ps3_controller.pressed_buttons and \
                mapping['ps3_controller/brake:OFF'] not in self.application.ps3_controller.pressed_buttons:
            new_state['ps3_controller/brake'] = True
        elif mapping['ps3_controller/brake:OFF'] in self.application.ps3_controller.pressed_buttons and \
                mapping['ps3_controller/brake:ON'] not in self.application.ps3_controller.pressed_buttons:
            new_state['ps3_controller/brake'] = False
        else:
            new_state['ps3_controller/brake'] = previous_state['ps3_controller/brake']

        if mapping['ps3_controller/new_dataset'] in self.application.ps3_controller.pressed_buttons:
            try:
                # TODO: Don't hard code this service port
                record_tracker_port = 8093
                record_tracker_host = 'localhost'
                seconds = 0.5
                endpoint = 'http://{host}:{port}/create-new-dataset'.format(
                    host=record_tracker_host,
                    port=record_tracker_port
                )
                _ = requests.post(
                    endpoint,
                    timeout=seconds
                )
            except:
                # TODO: Add exception logging here so that I can see stack trace without failing the whole server
                print('Failed to call record tracker part to create a new dataset!')

        self.application.button_states = new_state

    @tornado.concurrent.run_on_executor
    def get_metadata(self):
        self.translate_buttons()
        result = self.application.button_states
        result['ps3_controller/angle'] = self.application.ps3_controller.angle
        result['ps3_controller/throttle'] = self.application.ps3_controller.throttle
        self.application.ps3_controller.pressed_buttons = set()
        print(result)
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


class RemoveAllPS3Controllers(tornado.web.RequestHandler):
    """
    This class removes all PS3 controllers from the list of devices
    that you see in the bluetoothctl console when you type `devices`

    The instructions I've read online assume you're only using one
    PS3 device. It assumes that when you type the "devices" command
    you'll know which MAC address to copy because you'll only see
    one PS3 controller. If you have multiple registered PS3
    controllers, then you will have no way to tell which is which.
    The physical PS3 does not have any label about its MAC address
    so you couldn't figure it out even if you wanted to. So, what
    should you do if you need multiple controllers, for example if
    you're at a live event, and the battery of your first controller
    dies and you need the second? Assume that you will need to go
    through the registration process all over again with the second
    controller, which means wiping all registered controllers from
    the list of registered devices. That is what this class does.
    """
    executor = ThreadPoolExecutor(5)
    @tornado.concurrent.run_on_executor
    def remove_all_ps3_controllers(self):
        self.application.bluetoothctl.remove_all_ps3_controllers()
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.remove_all_ps3_controllers()
        self.write(result)

class SudoSixpair(tornado.web.RequestHandler):
    """
    Runs `sudo ./sixpair`. This will clear js0 from
    /dev/input, which will make it look like the
    controller has disconnected. The only way to get
    it to show up again is to reconnect it with the
    wire afterwards
    """
    executor = ThreadPoolExecutor(5)
    @tornado.concurrent.run_on_executor
    def sudo_sixpair(self):
        subprocess.check_output("sudo ./sixpair", shell=True)
        return {}

    @tornado.gen.coroutine
    def post(self):
        result = yield self.sudo_sixpair()
        self.write(result)

class PS3Controller():

    def __init__(self, verbose=False, force_start=False):
        self.angle = 0.0
        self.throttle = 0.0
        self.is_loop_on = False
        self.verbose = verbose
        self.pressed_buttons = set()
        self.force_start = force_start

        """
        Use this if you want to start the part loop using the
        editor.py UI to tell call the part server to tell it
        to start. I only use this when I want to start server
        manually for debugging
        """
        if self.force_start is True:
            self.start_loop()

    def loop(self):
        with SixAxisResource(bind_defaults=True) as self.joystick:
            # Register a button handler for the square button
            # self.joystick.register_button_handler(handler, SixAxis.BUTTON_SQUARE)
            print('starting loop')
            try:
                before = datetime.now()
                while True:

                    after = datetime.now()

                    # Read the x and y axes of the left hand stick, the right hand stick has axes 2 and 3
                    self.angle = self.joystick.axes[0].corrected_value()
                    self.throttle = self.joystick.axes[1].corrected_value()
                    pressed_buttons = set(self.joystick.get_and_clear_button_press_history())

                    """
                    This makes debugging easier and you only see it when
                    you're running the server in interactive, which you
                    only use for debugging anyways
                    """
                    if len(pressed_buttons) > 0:
                        print(pressed_buttons)

                    if self.verbose is True:
                        print(str(after) + ' raw angle: '+str(self.joystick.axes[0].raw_value)+' angle: '+str(self.angle)+' raw throttle '+str(self.joystick.axes[1].raw_value)+' throttle: '+str(self.throttle))

                    self.pressed_buttons = self.pressed_buttons.union(pressed_buttons)
                    self.is_loop_on = True
            except:
                traceback.print_exc()
                self.is_loop_on = False

    def start_loop(self):
        self.ps3_controller_thread = Thread(target=self.loop)
        self.ps3_controller_thread.daemon = False
        self.ps3_controller_thread.start()

def make_app():
    handlers = [
        (r'/get-state', GetState),
        (r"/health", Health),
        (r"/ps3-health", PS3Health),
        (r"/run-setup-commands", RunSetupCommands),
        (r"/is-connected", IsConnected),
        (r"/sudo-sixpair", SudoSixpair),
        (r"/start-sixaxis-loop", StartSixAxisLoop),
        (r"/remove-all-ps3-controllers", RemoveAllPS3Controllers),

    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8094)
    ap.add_argument(
        "--verbose",
        required=False,
        dest='verbose',
        action='store_true',
        default=False)

    """
    Use this if I want to start the loop outside of Tornado or
    the normal workflow. In the traditional workflow I use a
    post request to Tornado to start the loop, but I start the
    part with tornado I can't see verbose logs. If can see logs
    if I start manually, but until I added this CLI flag I
    couldn't start the part loop if I went the manual route
    """
    ap.add_argument(
        "--force-start",
        required=False,
        dest='force_start',
        action='store_true',
        default=False)

    args = vars(ap.parse_args())
    port = args['port']

    app = make_app()
    app.listen(port)
    app.ps3_controller = PS3Controller(
        verbose=args['verbose'],
        force_start=args['force_start']
    )

    # TODO: Put this in a DB. It's bad to maintain state in the API
    app.button_states = {
        'ps3_controller/recording':False,
        'ps3_controller/brake':True
    }

    app.bluetoothctl = Bluetoothctl()
    app.sixaxis_thread = None
    app.is_sixaxis_loop_on = False
    tornado.ioloop.IOLoop.current().start()

