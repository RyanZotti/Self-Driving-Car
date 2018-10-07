import argparse
import functools
import json
import traceback

import requests

from car.record_reader import RecordReader
from data_augmentation import apply_transformations
from util import *

ap = argparse.ArgumentParser()
ap.add_argument(
    "--checkpoint_dir",
    required=False,
    help="path to all of the data",
    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/tf_visual_data/runs/4/checkpoints')
ap.add_argument(
    "--data_path",
    required=False,
    help="path to all of the data",
    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data')
ap.add_argument(
    "--image_scale",
    required=False,
    help="Resize image scale",
    default=0.0625)
ap.add_argument(
    "--label_path",
    required=False,
    help="Where to find a single image to compare predictions",
    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_2_18-04-15/record_845.json')
ap.add_argument(
    "--port",
    required=False,
    help="Serer port to use",
    default=8888)
ap.add_argument(
    "--repo_dir",
    required=False,
    help="Where the repo directory is located",
    default='/Users/ryanzotti/Documents/repos/Self-Driving-Car')

args = vars(ap.parse_args())
checkpoint_dir = args['checkpoint_dir']
data_path = args['data_path']
image_scale = float(args['image_scale'])
label_path = args['label_path']
port=args['port']
repo_dir=args['repo_dir']

# Run prediction API as a subprocess
api_path = functools.reduce(os.path.join, [repo_dir, 'ai','ai.py'])
cmd = '''
    python {api_path} \
        --checkpoint_dir {checkpoint_dir} \
        --image_scale {image_scale} \
        --port {port}
    '''.format(
        api_path=api_path,
        checkpoint_dir=checkpoint_dir,
        image_scale=image_scale,
        port=port)
api_process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)

try:

    # Load model just once and store in memory for all future calls
    sess, x, prediction = load_model(checkpoint_dir)

    record_reader = RecordReader(base_directory=data_path)
    image, _, _ = record_reader.read_record(label_path)

    # TODO: Fix this bug. Right now if I don't pass mirror image, model outputs unchanging prediction
    flipped_image = cv2.flip(image, 1)
    normalized_images = [image, flipped_image]
    normalized_images = np.array(normalized_images)

    # Normalize for contrast and pixel size
    normalized_images = apply_transformations(
        images=normalized_images,
        image_scale=image_scale)

    prediction = prediction.eval(feed_dict={x: normalized_images}, session=sess).astype(float)

    # Ignore second prediction set, which is flipped image, a hack
    local_prediction = list(prediction[0])
    local_angle, local_throttle = local_prediction

    # Read image. OpenCV interprets 1 as RGB
    # Must read raw image so that string-to-image conversion not applied twice
    raw_image = cv2.imread(record_reader.image_path_from_label_path(label_path), 1)

    img = cv2.imencode('.jpg', raw_image)[1].tostring()
    url = 'http://localhost:{port}/predict'.format(port=port)
    files = {'image': img}
    request = requests.post(url, files=files)
    response = json.loads(request.text)
    api_prediction = response['prediction']
    api_angle, api_throttle = api_prediction

    print('Angle:: local:{local_angle} api:{api_angle}'.format(
        local_angle=local_angle,
        api_angle=api_angle
    ))
    assert(local_angle==api_angle)
    print('Throttle:: local:{local_throttle} api:{api_throttle}'.format(
        local_throttle=local_throttle,
        api_throttle=api_throttle
    ))
    assert(local_throttle==api_throttle)

except:
    traceback.print_exc()
finally:
    # Close the API process so I don't have zombie processes
    api_process.kill()