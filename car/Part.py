import abc
from datetime import datetime
import json
from threading import Thread
import traceback


class Part:

    def __init__(self, name, port, url, host=None, input_names=None, output_names=None,
            latency_threshold_seconds=0.5, is_loopable=True, is_localhost=True, is_verbose=False):

        """
        This function creates a new part. This is used as a
        template for the client portion a part's client-server
        architecture

        Parameters
        ----------
        name: string
            This is the common name of the part. The name serves
            two purposes. First, it's prepended to the part's
            output names, so camera outputs becomes camera/image_array.
            Second, it's used in Vehicle.py to assign a name to
            each part for faster lookup. For example, if I need
            to immediately apply the brake I can just pull the
            part named "engine" from Vehicle.py's parts dictionary.
            In the case of the model, I use the part's name to check
            if it matches the drive mode (remote_model, local_model
            or user)
        port: int
            The server's port
        url: string
            The url associated with server. It doesn't matter if
            you include a leading / or not. I sanitize it either
            way
        host: string
            The host can take on three types of values. If no host
            is specified because you are running on the Pi, this will
            be set to "localhost", since Docker's --net=host option
            uses localhost (required for PS3 Bluetooth to work). On
            the Mac, a Docker container must run in a named Linux VM,
            so the part's host takes on its part name. Lastly, a
            part could be executed remotely, like the remote model,
            which could be on AWS, your laptop, etc. If you specify
            a host the code will assume you're referring to a remote
            service. If you add the --localhost flag, when you call
            start.py, the code will assume you're running on the Pi
        is_loopable: boolean
            This field is used for parts that shouldn't be executed
            every iteration of the infinite loop. For example, the
            record_tracker.py part should run once per part loop,
            but the camera should update as frequently as it can,
            sometimes multiple times per part loop. Parts that run
            continuously will always have a value of True, whereas
            parts that run infrequently will have their state toggled
            on/off. When an infrequently run part learns that it should
            make a call, it will set this variable to True, and then
            when that part's request method is subsequently called it
            will set the value to False to prevent unintended future
            runs
        input_names: list<string>
            An ordered list of the named inputs
        output_names: list<string>
            An ordered list of the named outputs
        latency_threshold_seconds: float
            The number of seconds beyond which the part server is
            marked as unresponsive
        is_localhost: boolean
            Indicates whether to use the part's default hostname or
            localhost. This way I don't need an if statement for
            every single part in vehicle.py when I switch between
            running on the Mac, which requires named containers, or
            on the Pi, where I need to use --net=host and localhost.
            This way I can pass a single boolean to the start.py CLI
            in argparse and it will cascade the change to all parts
        is_verbose: boolean
            Indicates whether to print the stack trace of the part.
            This can be really noisy when the model services aren't
            on, but can be helpful for other services
        """

        self.last_update_time = None
        self.thread = Thread(target=self.infinite_loop, args=())
        self.thread.daemon = True
        self.name = name

        self.is_localhost = is_localhost
        if host is not None:
            # Remote services, like remote model, can be anything
            self.host = host
        elif self.is_localhost == True:
            # Pi services use Docker's --net=host and localhost
            self.host = 'localhost'
        else:
            # MacOS containers are named and run in a Linux VM
            self.host = name

        self.port = port
        self.input_names = input_names
        if self.input_names is not None:
            self.initialize_inputs()
        self.output_names = output_names
        self.outputs = None
        self.url = self.sanitize_url(url)

        self.is_loopable = is_loopable
        self.is_requestable = True
        if not self.is_loopable:
            """
            If a part such as the record writer should only run
            when called, then initialize the run indicator to
            False. Otherwise the part will run the first time
            without user input when the class is instantiated.
            This variable will get set to True in the self.call()
            method and then set back to False in the
            self.request() method, though this logic needs to be
            defined within each inheriting part class and is not
            defined in the Part class itself
            """
            self.is_requestable = False
        self.endpoint = 'http://{host}:{port}/{url}'.format(
            host=self.host,
            port=self.port,
            url=self.url
        )
        """
        Used to apply brake when a part takes too long to update.
        The most problematic part is often the prediction
        caller because it can sometimes take awhile to get a
        prediction. About 1-2% of the time the model has a huge
        delay, so I stop the car so it doesn't get stuck with a
        stale command and drive off the road. I release the brake
        as soon as all parts are marked as responsive again
        """
        self.latency_threshold_seconds = latency_threshold_seconds
        self.is_verbose = is_verbose

    def initialize_inputs(self):
        """
        Used to avoid "object has no attribute 'inputs' errors"
        """
        inputs = {}
        for input_name in self.input_names:
            inputs[input_name] = None
        self.inputs = inputs

    def sanitize_url(self, url):
        """
        Standardizes the url so that the user doesn't have to
        remember if they need a leading / or not

        Parameters
        ----------
        url : String
            A url to sanitize
        """
        if url[0] == '/':
            sanitized_url = url[1:]
        else:
            sanitized_url = url
        return sanitized_url

    @abc.abstractmethod
    def _call(self, *args):
        """
        A placeholder function that Vehicle.py uses to send
        data to the part and receive data from the part. This
        part is hidden so that non-part classes must call
        the public call(), which wraps the _call() function
        in a try-except clause and prevents the control-loop
        from completely crashing when one of the parts is not
        functioning properly, like when the PS3 controller is
        not alive, and therefore the engine is not able to
        receive inputs

        Note the single _ and not double __. If you use two
        underscores your subclasses won't be able to inherit
        the method: https://stackoverflow.com/a/20261595/554481

        Parameters
        ----------
        *args : List
            A list of generic args to be overwritten by the
            inheriting class
        """
        raise NotImplementedError

    def call(self, *args):
        """
        Wraps a part's _call() method in a try-except clause to
        avoid killing the entire control-loop when one part fails

        Parameters
        ----------
        *args : List
            A generic list of args, if any
        """
        try:
            self._call(*args)
            pass
        except:
            if self.is_verbose:
                traceback.print_exc()

    @abc.abstractmethod
    def request(self):
        """
        A placeholder function that the child class uses to
        define how to interact with a part's server
        """
        raise NotImplementedError

    def update_outputs(self, response, defaults=None):
        """
        This function ensures that outputs (if any) are returned
        in the same as order they are expected in the drive loop
        and Memory.py. Since I want to ensure atomic writes, I
        start by populating a new list. I only replace the old
        list once the new list has been completely updated

        Parameters
        ----------
        response : requests.response
            The result of the client's call to the server
        """
        data = json.loads(response.text)
        new_outputs = []
        for output_name in self.output_names:
            new_outputs.append(data[output_name])
        self.outputs = tuple(new_outputs)

    def infinite_loop(self):
        """
        This constantly communicates with the part's server. It's
        put in a loop so that it's possible to track when the
        server stops responding or has an error. If the
        last_update_time variable hasn't been updated in awhile
        you can assume that something is wrong with the part. The
        Vehicle.py class uses last_update_time to check if it
        should apply the emergency brake in the event that a
        critical part has become unresponsive
        """
        while True:
            if self.is_requestable:
                try:
                    self.request()
                    self.last_update_time = datetime.now()
                except:
                    if self.is_verbose:
                        traceback.print_exc()

    def get_last_update_time(self):
        """
        The Vehicle.py class uses last_update_time to check if it
        should apply the emergency brake in the event that a
        critical part has become unresponsive
        """
        return self.last_update_time

    def get_latency_seconds(self):
        """
        Returns
        ----------
        diff_seconds : boolean
            The number of seconds since the client last heard
            from the server or None if the client has never
            heard from the server
        """
        now = datetime.now()
        if self.last_update_time is not None:
            diff_seconds = (now - self.last_update_time).total_seconds()
            return diff_seconds
        else:
            return None

    def is_responsive(self):
        """
        Returns
        ----------
        is_responsive : boolean
            Boolean indicating if the part's server has responded
            within a reasonable amount of time
        """
        latency_seconds = self.get_latency_seconds()
        if latency_seconds is None:
            return False
        else:
            if latency_seconds > self.latency_threshold_seconds:
                return False
            else:
                return True

    def print_latency_warning(self):
        """
        Useful debugging feature
        """
        latency_seconds = self.get_latency_seconds()
        if latency_seconds is None:
            print('{timestamp} - {part} has never connected!'.format(
                part=self.name,
                seconds=latency_seconds,
                timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
            ))
        else:
            print('{timestamp} - {part} delayed by {seconds} seconds!'.format(
                part=self.name,
                seconds=latency_seconds,
                timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
            ))

    def is_safe(self):
        """
        A placeholder function that the child class defines to
        check if it is safe for the car to continue driving
        or if the brake should be applied. This can be replaced
        in the child class if the default is not sufficient
        """
        return self.is_responsive()

    def start(self):
        """
        Starts a part's client thread
        """
        self.thread.start()
