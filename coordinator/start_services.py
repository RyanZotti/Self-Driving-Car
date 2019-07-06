import argparse
import json
import requests
import traceback


ap = argparse.ArgumentParser()
ap.add_argument(
    "--target_host_type",
    required=True,
    help="Pi or Laptop"
)
ap.add_argument(
    "--target_host_os",
    required=True,
    help="Linux or Mac"
)
args = vars(ap.parse_args())
target_host_type = args['target_host_type']
target_host_os = args['target_host_os']

services = [
    'record-tracker',
    'ffmpeg',
    'control_loop',
    'user_input',
    'vehicle-engine',
    'ps3_controller'
]

seconds = 1
for service in services:
    try:
        request = requests.post(
            'http://localhost:8883/start-car-service',
            timeout=seconds,
            data=json.dumps({
                'target_host_os':target_host_os,
                'target_host_type': target_host_type,
                'service':service
            })
        )
        print('Started: {service}'.format(service=service))
    except:
        traceback.print_exc()

print('Finished')