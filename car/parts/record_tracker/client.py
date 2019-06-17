import json
import requests
from car.Part import Part


class Client(Part):

    def __init__(self, name, input_names, input_types, host='record_tracker', port=8093, url='/write-record'):
        super().__init__(
            name=name,
            host=host,
            port=port,
            url=url,
            input_names=input_names,
            is_loopable=False
        )
        self.input_types = input_types

    # Part.py runs this function in an infinite loop
    def request(self):
        json_payload = self.inputs
        json_payload['input_types'] = self.input_types
        response = requests.post(
            self.endpoint,
            data=json.dumps(json_payload)
        )
        self.is_requestable = False

    # This is how the main control loop interacts with the part
    def call(self, *args):
        self.inputs = dict(zip(self.input_names, *args))
        if self.inputs['user_input/recording']:
            self.is_requestable = True

    # TODO: Apply real logic
    def is_safe(self):
        """
        It's hard to define what a good health check would
        be for the record tracker. It runs intermittently
        so I can't use a "time since last update" type of
        check like I do for the other parts. I can replace
        this logic when I think of something. For now I'll
        hardcode it to True
        """
        return True
