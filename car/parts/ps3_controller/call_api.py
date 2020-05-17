import requests
import json


while True:
    response = requests.post('http://ryanzotti.local:8094/get-angle-and-throttle')
    state = json.loads(response.text)
    print(state)