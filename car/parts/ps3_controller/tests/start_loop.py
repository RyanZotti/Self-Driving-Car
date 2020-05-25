import requests
import json

host = 'ryanzotti.local'
port = 8094
seconds = 0.5
endpoint = 'http://{host}:{port}/start-sixaxis-loop'.format(
    host=host,
    port=port
)
response = requests.post(
    endpoint,
    timeout=seconds
)
result = json.loads(response.text)
print(result)