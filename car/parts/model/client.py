import cv2
import requests
from car.Part import Part


class client(Part):

    def __init__(self, name, input_names, output_names, host, port=8885, url='/predict'):
        super().__init__(
            name=name,
            host=host,
            port=port,
            url=url,
            input_names=input_names,
            output_names=output_names
        )
        self.outputs = None

    # Part.py runs this function in an infinite loop
    def request(self):
        frame = self.inputs['cam/image_array']
        img = cv2.imencode('.jpg', frame)[1].tostring()
        files = {'image': img}
        timeout_seconds = 1
        response = requests.post(
            self.endpoint,
            files=files,
            timeout=timeout_seconds
        )
        """
        Normally I should call self.update_outputs(response=response),
        but update_outputs() expects that the server returns dictionary
        keys that match the names in memory.py, and in this case the
        key is supposed to be model/angle and
        model/throttle. The prediction is only remotely with
        respect to the Pi. On my laptop the prediction is local. So I
        wanted to decouple the naming convention between the Pi and my
        laptop in this case, but that required skipping the
        update_outputs() function
        """
        prediction = response['prediction']
        predicted_angle = prediction[0]
        self.outputs = predicted_angle

    # This is how the main control loop interacts with the part
    def call(self, *args):
        self.inputs = dict(zip(self.input_names, args))
        return self.outputs
