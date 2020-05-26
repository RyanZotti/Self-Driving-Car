import requests
import json

response = requests.post('http://ryanzotti.local:8094/run-setup-commands')
print(response.text)