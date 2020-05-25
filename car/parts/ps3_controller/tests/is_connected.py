import requests
import json

response = requests.post('http://ryanzotti.local:8094/is-connected')
state = json.loads(response.text)
print(state)