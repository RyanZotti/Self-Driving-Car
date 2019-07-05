import json
import requests
from car.Part import Part


class Client(Part):

    def __init__(self, name, input_names, host='vehicle-memory', port=8095, url='/update'):
        super().__init__(
            name=name,
            host=host,
            port=port,
            url=url,
            input_names=input_names
        )
        self.outputs = None

    # Part.py runs this function in an infinite loop
    def request(self):
        timeout_seconds = 1
        response = requests.post(
            self.endpoint,
            data=json.dumps(self.inputs),
            timeout=timeout_seconds
        )

    # This is how the main control loop interacts with the part
    def call(self, *args):
        self.inputs = dict(zip(self.input_names, *args))
