# Before running `jupyter notebook` type the following:
# REPO_PATH="/Users/ryanzotti/Documents/repos/Self-Driving-Car"
# export PYTHONPATH=${REPO_PATH}

import cv2
from data_augmentation import apply_transformations
from util import *
from ai.record_reader import RecordReader
from data_augmentation import process_data, process_data_continuous
import requests
import json

path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/tf_visual_data/runs/8/checkpoints'
sess, x, prediction = load_model(path)

data_path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data'
record_reader = RecordReader(base_directory=data_path,batch_size=50)
server_path = '/Users/ryanzotti/Documents/repos/Self-Driving-Car/car/parts/web/server/ai.py'
image_scale = 0.125
crop_factor = 3

# Run model server as a subprocess
cmd = 'python3 {server} --port {port} --image_scale {image_scale} --crop_factor {crop_factor} --checkpoint_dir {model}'.format(
    server=server_path,
    port=8888,
    image_scale=0.125,
    model=path,
    crop_factor=crop_factor)
#process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)
model_api = 'http://Ryans-MacBook-Pro.local:8885/predict'

for label_path in record_reader.train_paths:

    image_path = record_reader.image_path_from_label_path(label_path)

    # RecordReader already applies image string conversion, so ignore
    # image read from here and read with OpenCV. Image string conversion
    # will take place when image is passed to API
    _, angle, throttle = record_reader.read_record(label_path=label_path)

    # Read image from disk
    img_arr = cv2.imread(image_path)

    batch = record_reader.get_train_batch()
    images, labels = batch[0], batch[1]

    img = cv2.imencode('.jpg', img_arr)[1].tostring()
    files = {'image': img}
    request = requests.post(model_api, files=files)
    response = json.loads(request.text)
    prediction = response['prediction']
    predicted_angle, predicted_throttle = prediction

    angle_mae = abs(float(angle) - float(predicted_angle))
    if throttle != 0:
        if angle_mae > 0.8:
            message = 'pred: {pred}, actual: {actual}, throttle: {throttle}, {path}'.format(
                pred=predicted_angle,
                actual=angle,
                path=image_path,
                throttle=throttle
            )
            print(message)
            cv2.imshow('frame', img_arr)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
            print()

#process.kill()