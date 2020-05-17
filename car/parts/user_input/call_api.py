import requests
import json

response = requests.get('http://ryanzotti.local:8884/get-state')
state = json.loads(response.text)
print(state)