import requests
import json

response = requests.get('http://ryanzotti.local:8093/get-current-dataset-name')
print(response.status_code)
print(response.text)
state = json.loads(response.text)
print(state)
