from car.vehicle import Vehicle
from car.config import load_config
from car.parts.camera import Webcam
from car.parts.engine import Engine
from car.parts.web_controller.web import LocalWebController
from car.parts.web_controller.prediction_caller import PredictionCaller
from car.parts.datastore import DatasetHandler



# Load default settings
cfg = load_config()

# Initialize the car
car = Vehicle()

# Add a webcam
cam = Webcam(ffmpeg_host=cfg.PI_HOSTNAME,name='camera',unit_test=False)
car.add(
    cam,
    outputs=['cam/image_array'],
    threaded=True)

# Add a local Tornado web server to receive commands
# http://localhost:8887/
ctr = LocalWebController(name='server')
car.add(
    ctr,
    inputs=['cam/image_array'],
    outputs=['user/angle', 'user/throttle', 'mode', 'recording'],
    threaded=True)

# This shouldn't have to know if the model exists.
# It should return 0s if the model doesn't exist
# or if the model exists but simply isn't reachable
# Add prediction caller
prediction_caller = PredictionCaller(model_api=cfg.MODEL_API,name='ai')
car.add(
    prediction_caller,
    inputs=['cam/image_array'],
    outputs=['ai/angle', 'ai/throttle'],
    threaded=True)

# Add engine
engine_inputs =[
    'user/angle',
    'user/throttle',
    'ai/angle',
    'ai/throttle',
    'mode']
engine = Engine(16, 18, 22, 19, 21, 23, name='engine', inputs=engine_inputs)
car.add(
    engine,
    inputs=engine_inputs,
    threaded=True)

# TODO: Record AI predictions as well
# TODO: Drive as user but record AI's silent predictions and error rates
# Add dataset to save data
recorded_inputs = [
    'cam/image_array',
    'user/angle',
    'user/throttle',
    'ai/angle',
    'ai/throttle',
    'mode']
types = [
    'image_array',
    'float',
    'float',
    'float',
    'float',
    'str']
dh = DatasetHandler(path=cfg.DATA_PATH)
print(cfg.DATA_PATH)
dataset = dh.new_dataset_writer(inputs=recorded_inputs, types=types)
dataset.set_name('dataset')
car.add(
    dataset,
    inputs=recorded_inputs,
    run_condition='recording')

car.start(
    rate_hz=cfg.DRIVE_LOOP_HZ,
    max_loop_count=cfg.MAX_LOOPS)

print("You can now go to <your pi ip address>:8887 to drive your car.")
