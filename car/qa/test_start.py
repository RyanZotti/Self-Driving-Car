from car.config import load_config
from car.vehicle import Vehicle

# Load default settings
cfg = load_config()

# Initialize the car
car = Vehicle()

# Add a webcam
#cam = Webcam(ffmpeg_host=cfg.PI_HOSTNAME)
#car.add(cam, outputs=['cam/image_array'], threaded=True)

# Add a local Tornado web server to receive commands
ctr = LocalWebController()
car.add(ctr,
        inputs=['cam/image_array'],
        outputs=['user/angle', 'user/throttle', 'user/mode', 'recording'],
        threaded=True)

car.start(rate_hz=cfg.DRIVE_LOOP_HZ,
          max_loop_count=cfg.MAX_LOOPS)

print("You can now go to <your pi ip address>:8887 to drive your car.")
