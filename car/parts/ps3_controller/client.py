import json
import requests
from car.Part import Part


class Client(Part):

    def __init__(self, name, output_names, host='ps3_controller', port=8094, url='/get-angle-and-throttle'):
        super().__init__(
            name=name,
            host=host,
            port=port,
            url=url,
            output_names=output_names
        )
        self.outputs = None

    # Part.py runs this function in an infinite loop
    def request(self):
        timeout_seconds = 1
        response = requests.post(
            self.endpoint,
            timeout=timeout_seconds
        )
        if response is not None:
            self.update_outputs(response=response)

    # This is how the main control loop interacts with the part
    def call(self):
        return self.outputs
