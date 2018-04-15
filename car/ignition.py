from car.vehicle import Vehicle
from car.config import load_config
from car.parts.camera import Webcam
from car.parts.engine import Engine
from car.parts.web_controller.web import LocalWebController
from car.parts.datastore import TubHandler


# TODO: load from a default, relative path location
# Load default settings
cfg = load_config()

# Initialize the car
car = Vehicle()

# Add a webcam
cam = Webcam(ffmpeg_host=cfg.PI_HOSTNAME)
car.add(cam, outputs=['cam/image_array'], threaded=True)

# Add a local Tornado web server to receive commands
ctr = LocalWebController()
car.add(ctr,
        inputs=['cam/image_array'],
        outputs=['user/angle', 'user/throttle', 'user/mode', 'recording'],
        threaded=True)

# Add engine
engine = Engine(16, 18, 22, 19, 21, 23, ['user/angle', 'user/throttle'])
car.add(engine,
        inputs=['user/angle', 'user/throttle'],
        threaded=True)

# add tub to save data
inputs = ['cam/image_array', 'user/angle', 'user/throttle', 'user/mode']
types = ['image_array', 'float', 'float', 'str']

th = TubHandler(path=cfg.DATA_PATH)
print(cfg.DATA_PATH)
tub = th.new_tub_writer(inputs=inputs, types=types)
car.add(tub, inputs=inputs, run_condition='recording')

car.start(rate_hz=cfg.DRIVE_LOOP_HZ,
          max_loop_count=cfg.MAX_LOOPS)

print("You can now go to <your pi ip address>:8887 to drive your car.")
