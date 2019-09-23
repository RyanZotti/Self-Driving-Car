import json
import requests
from car.Part import Part


class Client(Part):

    def __init__(self, name, input_names, is_localhost, port=8092, url='/command', is_verbose=False):
        super().__init__(
            name=name,
            is_localhost=is_localhost,
            port=port,
            url=url,
            input_names=input_names,
            is_verbose=is_verbose
        )

    # The parent class, Part.py, automatically runs this function an in infinite loop
    def request(self):
        response = requests.post(
            self.endpoint,
            data=json.dumps(self.inputs)
        )

    # This is how the main control loop interacts with the part
    def _call(self, *args):
        try:
            self.inputs = dict(zip(self.input_names, *args))
        except:
            """
            If one of the parts that the engine needs is unavailable,
            then something is seriously wrong and the brake should
            be applied. This often happens if a critical part has
            failed on startup and therefore has never had a valid
            output for the engine to consume
            """
            self.brake(is_catastrophic=True)

    def brake(self, is_catastrophic=False):
        """
        Tells the car to stop moving. This can be called when
        everything is running smoothly and the user tells the
        car to stop, when an important part is slow and not
        responding, or when something has gone so wrong that
        the car can't even formulate the minimum required
        inputs which often happens if an issue occurs
        immediately on startup while some parts are still
        producing outputs that evaluate to None. In this case
        I pass in stub inputs to avoid "key not found" errors
        in the json_input of the server

        Parameters
        ----------
        is_catastrophic : boolean
            Indicates that something has gone so wrong that I
            need to pass stubbed inputs to avoid the brake from
            failing on the server due to "key not found" errors
            in the json_input
        """
        if is_catastrophic:
            """
            Pass minimum inputs to avoid killing the engine server
            while still telling the engine to brake
            """
            emergency_inputs = {
                'vehicle/brake':True,
                'ps3_controller/brake':True,
                'dashboard/brake': True
            }
            _ = requests.post(
                self.endpoint,
                data=json.dumps(emergency_inputs)
            )
        else:
            _ = requests.post(
                self.endpoint,
                data=json.dumps(self.inputs)
            )
