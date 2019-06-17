import argparse
from car.config import load_config
from car.vehicle import Vehicle
from car.Memory import Memory
from car.parts.video.client import Client as Camera
from car.parts.user_input.client import Client as UserInput
from car.parts.engine.client import Client as Engine
from car.parts.model.client import Client as Model
from car.parts.record_tracker.client import Client as RecordTracker


ap = argparse.ArgumentParser()
ap.add_argument(
    "--remote_host",
    required=False,
    help="The laptop's hostname",
    default='ryans-macbook-pro.local'
)
args = vars(ap.parse_args())
remote_host = args['remote_host']

# Load default settings
cfg = load_config()

# Assign default states
memory = Memory()
memory.put(['user_input/brake'], True)
memory.put(['user_input/driver_type'], 'user')
memory.put(['vehicle/brake'], True)

# Initialize the car
car = Vehicle(
    mem=memory,
    warm_up_seconds=cfg.WARM_UP_SECONDS
)

# Consume video from a cheap webcam
camera = Camera(
    name='camera',
    output_names=[
        'camera/image_array'
    ]
)
car.add(camera)

# Listen for user input
user_input = UserInput(
    name='user_input',
    output_names=[
        'user_input/angle',
        'user_input/brake',
        'user_input/driver_type',
        'user_input/max_throttle',
        'user_input/recording',
        'user_input/throttle'
    ]
)
car.add(user_input)

# Communicate with the engine
engine = Engine(
    name='engine',
    input_names=[
        'local_model/angle',
        'local_model/throttle',
        'remote_model/angle',
        'remote_model/throttle',
        'user_input/angle',
        'user_input/brake',
        'user_input/driver_type',
        'user_input/max_throttle'
        'user_input/throttle',
        'vehicle/brake'
    ]
)
car.add(engine)

# Optionally consume driving predictions from a remote model
remote_model = Model(
    name='remote_model',
    host=remote_host,
    input_names=[
        'camera/image_array',
        'user_input/driver_type'
    ],
    output_names=[
        'remote_model/angle'
    ]
)
car.add(remote_model)

# Optionally consume driving predictions from a local model
local_model = Model(
    name='local_model',
    host='local_model',
    input_names=[
        'camera/image_array',
        'user_input/driver_type'
    ],
    output_names=[
        'local_model/angle'
    ]
)
car.add(local_model)

# Track images and labels
"""
The input names and the input types need to
be in the same order. If you ever change the
names or types you'll also have to update the
client and server parts as well, since the
names are hard coded there
"""
record_tracker = RecordTracker(
    name='record_tracker',
    input_names=[
        'camera/image_array',
        'user_input/angle',
        'user_input/recording',
        'user_input/throttle'
    ],
    input_types=[
        'image_array',
        'float',
        'boolean',
        'float'
    ]
)
car.add(record_tracker)

car.start(
    rate_hz=cfg.DRIVE_LOOP_HZ,
    max_loop_count=cfg.MAX_LOOPS
)
