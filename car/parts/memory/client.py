import json
import requests
from car.Part import Part


class Client(Part):

    def __init__(self, name, input_names, is_localhost, port=8095, url='/update', is_verbose=False):
        super().__init__(
            name=name,
            is_localhost=is_localhost,
            port=port,
            url=url,
            input_names=input_names,
            is_verbose=is_verbose
        )
        self.outputs = None

    # Part.py runs this function in an infinite loop
    def request(self):
        timeout_seconds = 1
        response = self.session.post(
            self.endpoint,
            data=json.dumps(self.inputs),
            timeout=timeout_seconds
        )

    # This is how the main control loop interacts with the part
    def _call(self, *args):
        self.inputs = dict(zip(self.input_names, *args))
