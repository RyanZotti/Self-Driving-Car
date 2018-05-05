import glob
import cv2
import requests
import json
from pprint import pprint

files = glob.glob('/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_1_18-04-15/*')
for file in files:
    print(file)
    # Successfully reads an image
    image = cv2.imread(file, 1)
    # cv2.imshow('a', image)
    # cv2.waitKey(0)

    # TODO: send image via post request

    # This fixes error: AttributeError: 'numpy.ndarray' object has no attribute 'read'
    img = cv2.imencode('.jpg', image)[1].tostring()

    url = 'http://localhost:8888/predict'
    files = {'image': img}
    request = requests.post(url, files=files)

    pprint(request.text)
