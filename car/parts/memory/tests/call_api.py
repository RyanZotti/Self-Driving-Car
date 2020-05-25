import requests
import json


while True:
    response = requests.get('http://ryanzotti.local:8095/output')
    state = json.loads(response.text)
    print(state)