import cv2
from datetime import datetime
import json
import requests
from car.Part import Part


class Client(Part):

    def __init__(self, name, input_names, input_types, is_localhost, port=8093, url='/write-record', is_verbose=False):
        super().__init__(
            name=name,
            is_localhost=is_localhost,
            port=port,
            url=url,
            input_names=input_names,
            is_loopable=False,
            is_verbose=is_verbose
        )
        self.with_image_endpoint = 'http://{host}:{port}/{url}'.format(
            host=self.host,
            port=self.port,
            url='image'
        )
        self.without_image_endpoint = 'http://{host}:{port}/{url}'.format(
            host=self.host,
            port=self.port,
            url='labels'
        )
        self.input_types = input_types

    def request_with_image(self):
        try:
            image = self.inputs['camera/image_array']
            image_string = cv2.imencode('.jpg', image)[1].tostring()
            files = {'image': image_string}
            response = requests.post(
                self.with_image_endpoint,
                files=files
            )
            return True
        except:
            return False

    def request_without_image(self):
        """
        Ensure that the image is not serialized with
        simpler values like strings and floats.
        """
        json_payload = self.inputs.copy()
        del json_payload['camera/image_array']
        try:
            response = requests.post(
                self.without_image_endpoint,
                data=json.dumps(json_payload)
            )
            return True
        except:
            return False

    # Part.py runs this function in an infinite loop
    def request(self):
        """
        Unfortunately this request is complicated because post
        requests can send image data or JSON string data but
        not both: https://stackoverflow.com/a/27553321/554481
        So I send two separate requests, one with the image and
        one with the other data (floats, strings, etc), that
        cache the data on the server side, and then I send a
        third request after the first two complete that tells
        the server to write the cache to file and wipe the cache
        """
        print('{timestamp} - Record tracker client called service'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        # TODO: Parallelize these two requests
        is_with_image_success = self.request_with_image()
        is_without_image_succes = self.request_without_image()
        if is_with_image_success and is_without_image_succes:
            response = requests.post(
                self.endpoint
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
