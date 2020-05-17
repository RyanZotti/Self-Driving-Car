import cv2
import json
from car.Part import Part


class Client(Part):

    def __init__(self, name, input_names, output_names, is_localhost, host=None, port=8885, url='/predict', is_verbose=False):
        super().__init__(
            name=name,
            host=host,
            is_localhost=is_localhost,
            port=port,
            url=url,
            input_names=input_names,
            output_names=output_names,
            is_verbose=is_verbose
        )
        self.outputs = None

    # Part.py runs this function in an infinite loop
    def request(self):
        frame = self.inputs['camera/image_array']
        img = cv2.imencode('.jpg', frame)[1].tostring()
        files = {'image': img}
        timeout_seconds = 1
        response = self.session.post(
            self.endpoint,
            files=files,
            timeout=timeout_seconds
        )
        """
        Normally I should call self.update_outputs(response=response),
        but update_outputs() expects that the server returns dictionary
        keys that match the names in Memory.py, and in this case the
        key is supposed to be model/angle and
        model/throttle. The prediction is only remotely with
        respect to the Pi. On my laptop the prediction is local. So I
        wanted to decouple the naming convention between the Pi and my
        laptop in this case, but that required skipping the
        update_outputs() function
        """
        predicted_angle = json.loads(response.text)['prediction']
        self.outputs = predicted_angle

    # This is how the main control loop interacts with the part
    def _call(self, *args):
        self.inputs = dict(zip(self.input_names, *args))
        return self.outputs

    def is_safe(self):
        """
        The car is not safe to drive if the model is expected
        to provide commands but is down or is not responding
        fast enough. The Vehicle.py part loop checks this
        status to check if it should apply the emergency
        brake

        Returns
        ----------
        is_safe : boolean
            Boolean indicating if it is safe to continue driving
            the car given the current state of the part
        """
        driver_type = self.inputs['dashboard/driver_type']
        if driver_type is None:
            return False
        elif driver_type.lower() == 'local_model':
            if self.is_responsive():
                return True
            else:
                return False
        else:
            return True