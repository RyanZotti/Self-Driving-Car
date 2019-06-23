import json
import requests
from car.Part import Part


class Client(Part):

    def __init__(self, name, input_names, host='vehicle-engine', port=8092, url='/command'):
        super().__init__(
            name=name,
            host=host,
            port=port,
            url=url,
            input_names=input_names
        )

    # The parent class, Part.py, automatically runs this function an in infinite loop
    def request(self):
        response = requests.post(
            self.endpoint,
            data=json.dumps(self.inputs)
        )

    # This is how the main control loop interacts with the part
    def call(self, *args):
        self.inputs = dict(zip(self.input_names, args))

    def brake(self):
        response = requests.post(
            self.endpoint,
            data=json.dumps(self.inputs)
        )
