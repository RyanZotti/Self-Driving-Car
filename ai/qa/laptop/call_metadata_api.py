import json
import requests

response = requests.post(
    'http://localhost:8886/model-metadata'
)

result = json.loads(response.text)
print(result)
