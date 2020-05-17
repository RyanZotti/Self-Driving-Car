import cv2
from datetime import datetime
import json
import requests


# constants
port = 8886


image_path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data/dataset_2_18-10-20/1385_cam-image_array_.png'
raw_image = cv2.imread(image_path, 1)

before = datetime.utcnow()
img = cv2.imencode('.jpg', raw_image)[1].tostring()
url = 'http://localhost:{port}/predict'.format(port=port)
files = {'image': img}
response = requests.post(url, files=files)
print(response.status_code)
text = response.text
print(text)
response_payload = json.loads(text)
api_prediction = response_payload['prediction']
api_angle = api_prediction
print(api_angle)
after = datetime.utcnow()
diff_seconds = (after - before).total_seconds()
print(f'API call took {diff_seconds} seconds')
