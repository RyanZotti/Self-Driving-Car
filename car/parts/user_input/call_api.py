import requests
import json


response = requests.post(
    'http://ryanzotti.local:8884/track-human-requests',
    json={
        'host': 'ryanzotti.local',
        'port': 8884, 'dashboard/brake': False,
        'dashboard/model_constant_throttle': '50',
        'dashboard/driver_type': 'user'
    }
)
state = json.loads(response.text)
print(state)