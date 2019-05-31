import cv2
from car.Part import Part
import urllib.request
from car.utils import *


class Client(Part):

    def __init__(self, name, output_names, host='ffmpeg', port=8091, url='/video'):
        super().__init__(
            name=name,
            host=host,
            port=port,
            url=url,
            output_names=output_names
        )
        # Need to define as None to avoid "does not exist bugs"
        self.frame = None
        self.stream = None
        try:
            self.open_stream()
        except:
            pass

    # This automatically gets called in an infinite loop by the parent class, Part.py
    def request(self):
        if self.stream is None:
            self.open_stream()
        self.opencv_bytes += self.stream.read(1024)
        a = self.opencv_bytes.find(b'\xff\xd8')
        b = self.opencv_bytes.find(b'\xff\xd9')
        if a != -1 and b != -1:
            jpg = self.opencv_bytes[a:b + 2]
            self.opencv_bytes = self.opencv_bytes[b + 2:]
            frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if cv2.waitKey(1) == 27:
                exit(0)
            self.frame = frame

    # This is how the main control loop interacts with the part
    def call(self):
        return self.frame

    def open_stream(self):
        self.stream = urllib.request.urlopen(self.endpoint)
        self.opencv_bytes = bytes()
