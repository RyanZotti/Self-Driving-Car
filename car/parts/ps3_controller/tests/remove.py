import json
import requests


seconds = 3
endpoint = 'http://{host}:{port}/remove-all-ps3-controllers'.format(
    host='ryanzotti.local',
    port=8094
)
response = requests.post(
    endpoint,
    timeout=seconds
)
print(response.text)