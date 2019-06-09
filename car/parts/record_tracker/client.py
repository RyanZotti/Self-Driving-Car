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
        self.inputs = dict(zip(self.input_names, args))
        self.is_requestable = True

    def is_safe(self):
        """
        This part's responsiveness only matters when trying to
        write a record. If you're not trying to write a record
        then the responsiveness doesn't matter

        Returns
        ----------
        is_safe : boolean
            Boolean indicating if it is safe to continue driving
            the car given the current state of the part
        """
        is_recording = self.inputs['user_input/recording']
        if is_recording:
            if self.is_responsive():
                return True
            else:
                return False
        else:
            return True
