import glob
import cv2
import requests
import json
from pprint import pprint
from os.path import dirname, join
import pandas as pd
from sklearn.metrics import mean_squared_error
from math import sqrt



data = {
    'angle':[],
    'throttle':[],
    'angle_model':[],
    'throttle_model':[]
}

#label_paths = glob.glob('/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_1_18-04-15/record*.json')

label_paths = glob.glob('/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_4_18-04-15/record_891.json')
for label_path in label_paths:
    print(label_path)

    # Parse JSON file
    with open(label_path, 'r') as f:
        contents = json.load(f)

    # Extract file contents
    angle = contents['user/angle']
    throttle = contents['user/throttle']
    image_file = contents['cam/image_array']
    folder_path = dirname(label_path)
    image_path = join(folder_path, image_file)

    # Read image. OpenCV interprets 1 as RGB
    image = cv2.imread(image_path, 1)

    # Use this for comparing with Trainer.py
    #image = cv2.imread('/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_1_18-04-15/1034_cam-image_array_.jpg', 1)


    # TODO: send image via post request

    # This fixes error: AttributeError: 'numpy.ndarray' object has no attribute 'read'
    img = cv2.imencode('.jpg', image)[1].tostring()
    #print(image[0])
    url = 'http://localhost:8888/predict'
    files = {'image': img}
    request = requests.post(url, files=files)
    response = json.loads(request.text)
    prediction = response['prediction']
    predicted_angle, predicted_throttle = prediction
    pprint(response)
    data['angle'].append(angle)
    data['throttle'].append(throttle)
    data['angle_model'].append(predicted_angle)
    data['throttle_model'].append(predicted_throttle)

    rmse = sqrt(mean_squared_error([angle], [predicted_angle]))
    print(rmse)

    df = pd.DataFrame(data)
    df.to_csv(path_or_buf='/Users/ryanzotti/Documents/repos/Self-Driving-Car/ai/df.csv')


print('Finisned')
