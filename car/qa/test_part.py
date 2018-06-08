from datetime import datetime
import time
from random import randint

from car.parts.part import Part


class FakePart(Part):

    def __init__(self):
        super().__init__()
        self.fake_value = randint(1,100)

    def update(self):
        sleep_seconds = 1
        time.sleep(sleep_seconds)
        self.fake_value = randint(1,100)
        self.last_update_time = datetime.now()

    def run_threaded(self):
        return self.fake_value