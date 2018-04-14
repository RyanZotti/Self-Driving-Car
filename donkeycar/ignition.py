from donkeycar.vehicle import Vehicle
from donkeycar.config import load_config
from donkeycar.parts.camera import Webcam
from donkeycar.parts.web_controller.web import LocalWebController


# Load default settings
cfg = load_config(config_path='/Users/ryanzotti/Documents/repos/Self-Driving-Car/donkeycar/templates/config_defaults.py')

# Initialize the car
v = Vehicle()

# Add a webcam
cam = Webcam(ffmpeg_host=cfg.PI_HOSTNAME)
v.add(cam, outputs=['cam/image_array'], threaded=True)

# Add a local Tornado web server to receive commands
ctr = LocalWebController()
v.add(ctr,
      inputs=['cam/image_array'],
      outputs=['user/angle', 'user/throttle', 'user/mode', 'recording'],
      threaded=True)

v.start(rate_hz=cfg.DRIVE_LOOP_HZ,
        max_loop_count=cfg.MAX_LOOPS)

print("You can now go to <your pi ip address>:8887 to drive your car.")