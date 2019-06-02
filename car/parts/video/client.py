import cv2
from car.Part import Part
import urllib.request
from car.utils import *


class Client(Part):

    def __init__(self, name, output_names, host='localhost', port=8091, url='/video', consecutive_no_image_count_threshold=150):
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

        """
        When the video is streaming well, about 1 of every 15
        iterations of the infinite loop produces an image. When
        the video is killed and there is nothing to show, the else
        part of the loop gets called consecutively indefinitely.
        I can avoid the zombie threads that take over my entire
        Tornado server (99% of CPU) if I check a consecutive
        failure count exceeding some arbitrarily high threshold
        """
        self.consecutive_no_image_count = 0
        self.consecutive_no_image_count_threshold = consecutive_no_image_count_threshold
        self.was_available = False
        self.is_video_alive = False

    # This automatically gets called in an infinite loop by the parent class, Part.py
    def request(self):
        if self.stream is None or self.is_video_alive == False:
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
            self.consecutive_no_image_count = 0
            self.was_available = True
            self.is_video_alive = True
        else:
            if self.was_available:
                self.consecutive_no_image_count = 1
            else:
                self.consecutive_no_image_count += 1
            if self.consecutive_no_image_count > self.consecutive_no_image_count_threshold:
                self.is_video_alive = False
                raise Exception
            self.was_available = False

    # This is how the main control loop interacts with the part
    def call(self):
        return self.frame

    def open_stream(self):
        self.stream = urllib.request.urlopen(self.endpoint)
        self.opencv_bytes = bytes()
