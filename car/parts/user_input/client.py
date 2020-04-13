import json
import requests
from car.Part import Part


class Client(Part):

    def __init__(self, name, output_names, is_localhost, port=8884, url='/get-input', is_verbose=False):
        super().__init__(
            name=name,
            is_localhost=is_localhost,
            port=port,
            url=url,
            output_names=output_names,
            is_verbose=is_verbose
        )
        self.outputs = None

    # Part.py runs this function in an infinite loop
    def request(self):
        timeout_seconds = 1
        response = self.session.get(
            self.endpoint,
            timeout=timeout_seconds
        )
        if response is not None:
            self.update_outputs(response=response)

    # This is how the main control loop interacts with the part
    def _call(self):
        return self.outputs
