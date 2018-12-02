import argparse
import json
import requests
from concurrent.futures import ThreadPoolExecutor


ap = argparse.ArgumentParser()
ap.add_argument(
    "--dataset", required=True,
    help="Dataset to score"
)
ap.add_argument(
    "--predictions_port", required=True,
    help="Port to the prediction server"
)
ap.add_argument(
    "--datasets_port", required=True,
    help="Port to the datasets server"
)
args = vars(ap.parse_args())
predictions_port = args['predictions_port']
datasets_port = args['datasets_port']
dataset = args['dataset']
# python batch_predict.py --dataset dataset_1_18-10-20 --predictions-port 8885 --datasets-port 8883

def get_record_ids(dataset, port):
    data = {
        'dataset': dataset,
        'dataset_type': 'review'
    }
    datasets_url = 'http://localhost:{port}/dataset-record-ids'.format(
        port=port
    )
    request = requests.post(
        url=datasets_url,
        json=data
    )
    response = json.loads(request.text)
    record_ids = response['record_ids']
    return record_ids


def get_prediction(dataset, record_id, port):
    data = {
        'dataset': dataset,
        'record_id': record_id
    }
    datasets_url = 'http://localhost:{port}/ai-angle'.format(
        port=port
    )
    request = requests.post(
        url=datasets_url,
        json=data
    )
    response = json.loads(request.text)
    angle = response['angle']
    return angle


def get_human_label(dataset, record_id, port):
    data = {
        'dataset': dataset,
        'record_id': record_id
    }
    datasets_url = 'http://localhost:{port}/user-labels'.format(
        port=port
    )
    request = requests.post(
        url=datasets_url,
        json=data
    )
    response = json.loads(request.text)
    angle = response['angle']
    return angle

def package_results(dataset, record_id, port):
    human_angle = get_human_label(
        dataset=dataset,
        record_id=record_id,
        port=port
    )
    model_angle = get_prediction(
        dataset=dataset,
        record_id=record_id,
        port=port
    )
    abs_error = abs(human_angle - model_angle)
    return {
        'human':human_angle,
        'ai':model_angle,
        'error':abs_error
    }

record_ids = get_record_ids(
    dataset=dataset,
    port=datasets_port
)
with ThreadPoolExecutor(max_workers=5) as executor:
    results = executor.map(
        lambda record_id:
            package_results(
                dataset=dataset,
                record_id=record_id,
                port=datasets_port
            ),
            record_ids
    )
    print(results)