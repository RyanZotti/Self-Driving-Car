import argparse
from car.config import load_config
from car.vehicle import Vehicle
from car.Memory import Memory
from car.parts.video.client import Client as Camera
from car.parts.user_input.client import Client as UserInput
from car.parts.engine.client import Client as Engine
from car.parts.ps3_controller.client import Client as PS3Controller
from car.parts.model.client import Client as Model
from car.parts.record_tracker.client import Client as RecordTracker
from car.parts.memory.client import Client as MemoryClient


ap = argparse.ArgumentParser()
ap.add_argument(
    "--remote_host",
    required=False,
    help="The laptop's hostname",
    default='ryans-macbook-pro.local'
)
ap.add_argument(
    "--port",
    required=False,
    help="Port for vehicle health check",
    default=8887
)
"""
The `store_true` defaulting to False is confusing, but
that's the way it is according to Stackoverflow:
https://stackoverflow.com/a/15008806/554481
"""
ap.add_argument(
    "--localhost",
    action='store_true',
    dest='is_localhost',
    help="Indicates if control-loop clients should expect part services on localhost or named Docker container"
)

part_names = [
    "video",
    "record-tracker",
    "control-loop",
    "user-input",
    "engine",
    "ps3-controller",
    "local-model",
    "remote-model",
    "memory"
]
for part_name in part_names:
    ap.add_argument(
        "--verbose-"+part_name,
        action='store_true',
        dest='verbose-'+part_name,
        help="Indicates if the control-loop should print exceptions from this part"
    )

args = vars(ap.parse_args())
remote_host = args['remote_host']
port = int(args['port'])
is_localhost = args['is_localhost']

# Load default settings
cfg = load_config()

# Assign default states
memory = Memory()
memory.put(['ps3_controller/brake'], True)
memory.put(['dashboard/brake'], False)
memory.put(['dashboard/driver_type'], 'user')
memory.put(['vehicle/brake'], True)

# Initialize the car
car = Vehicle(
    mem=memory,
    warm_up_seconds=cfg.WARM_UP_SECONDS,
    port=port
)

# Consume video from a cheap webcam
camera = Camera(
    name='video',
    output_names=[
        'camera/image_array'
    ],
    is_localhost=is_localhost,
    is_verbose=args['verbose-video']
)
car.add(camera)

# Listen for user input
user_input = UserInput(
    name='user-input',
    output_names=[
        'dashboard/brake',
        'dashboard/driver_type',
        'dashboard/model_constant_throttle'
    ],
    is_localhost=is_localhost,
    is_verbose=args['verbose-user-input']
)
car.add(user_input)

# Communicate with the engine
engine = Engine(
    name='engine',
    input_names=[
        'dashboard/brake',
        'dashboard/driver_type',
        'dashboard/model_constant_throttle'
        'local_model/angle',
        'local_model/throttle',
        'ps3_controller/angle',
        'ps3_controller/brake',
        'ps3_controller/throttle',
        'remote_model/angle',
        'remote_model/throttle',
        'vehicle/brake'
    ],
    is_localhost=is_localhost,
    is_verbose=args['verbose-engine']
)
car.add(engine)

# Exposes the car's data to external services
memoryClient = MemoryClient(
    name='memory',
    input_names=[
        'dashboard/brake',
        'dashboard/driver_type',
        'dashboard/model_constant_throttle',
        'local_model/angle',
        'local_model/throttle',
        'ps3_controller/angle',
        'ps3_controller/brake',
        'ps3_controller/new_dataset',
        'ps3_controller/recording',
        'ps3_controller/throttle',
        'remote_model/angle',
        'remote_model/throttle',
        'vehicle/brake'
    ],
    is_localhost=is_localhost,
    is_verbose=args['verbose-memory']
)
car.add(memoryClient)

# Optionally consume driving predictions from a remote model
remote_model = Model(
    name='remote-model',
    host=remote_host,
    input_names=[
        'camera/image_array',
        'dashboard/driver_type'
    ],
    output_names=[
        'remote_model/angle'
    ],
    is_localhost=False,
    is_verbose=args['verbose-remote-model']
)
#car.add(remote_model)

# Optionally consume driving predictions from a local model
local_model = Model(
    name='local-model',
    input_names=[
        'camera/image_array',
        'dashboard/driver_type'
    ],
    output_names=[
        'local_model/angle'
    ],
    is_localhost=is_localhost,
    is_verbose=args['verbose-local-model']
)
#car.add(local_model)

ps3_controller = PS3Controller(
    name='ps3-controller',
    output_names=[
        'ps3_controller/angle',
        'ps3_controller/brake',
        'ps3_controller/new_dataset',
        'ps3_controller/throttle',
        'ps3_controller/recording'
    ],
    is_localhost=is_localhost,
    is_verbose=args['verbose-ps3-controller']
)
car.add(ps3_controller)

# Track images and labels
"""
The input names and the input types need to
be in the same order. If you ever change the
names or types you'll also have to update the
client and server parts as well, since the
names are hard coded there
"""
record_tracker = RecordTracker(
    name='record-tracker',
    input_names=[
        'camera/image_array',
        'ps3_controller/angle',
        'ps3_controller/recording',
        'ps3_controller/throttle'
    ],
    input_types=[
        'image_array',
        'float',
        'boolean',
        'float'
    ],
    is_localhost=is_localhost,
    is_verbose=args['verbose-record-tracker']
)
car.add(record_tracker)

car.start(
    rate_hz=cfg.DRIVE_LOOP_HZ,
    max_loop_count=cfg.MAX_LOOPS
)
