import argparse
import json
import requests
from concurrent.futures import ThreadPoolExecutor
import os
import psycopg2
import psycopg2.extras
from coordinator.utilities import *


# A single place for all connection related details
# Storing a password in plain text is bad, but this is for a temp db with default credentials
def connect_to_postgres(host='localhost'):
    connection_string = "host='localhost' dbname='autonomous_vehicle' user='postgres' password='' port=5432"
    connection = psycopg2.connect(connection_string)
    cursor = connection.cursor(cursor_factory = psycopg2.extras.RealDictCursor)
    return connection, cursor


def execute_sql(sql):
    connection, cursor = connect_to_postgres()
    cursor.execute(sql)
    cursor.close()
    connection.close()


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
# python batch_predict.py --dataset dataset_3_18-10-20 --predictions_port 8885 --datasets_port 8883

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


def get_prediction(dataset, record_id, model_id, epoch, port):
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
    start_sql = '''
        BEGIN;
        INSERT INTO predictions (
            dataset,
            record_id,
            model_id,
            epoch,
            angle
        )
        VALUES (
           '{dataset}',
            {record_id},
            {model_id},
            {epoch},
            {angle}
        );
        COMMIT;
        '''.format(
        dataset=dataset,
        record_id=record_id,
        model_id=model_id,
        epoch=epoch,
        angle=angle
    )
    execute_sql(start_sql)
    return angle


record_ids = get_record_ids(
    dataset=dataset,
    port=datasets_port
)

request = requests.post(
    'http://localhost:8885/model-meta-data'
)
response = json.loads(request.text)
model_id = response['model_id']
epoch = response['epoch']

process_id = os.getpid()
start_sql = '''
    BEGIN;
    INSERT INTO live_prediction_sync (dataset, pid, start_time)
    VALUES ('{dataset}',{pid}, NOW());
    COMMIT;
    '''.format(
        dataset=dataset,
        pid=process_id,
    )
execute_sql(start_sql)

execute_sql('''
    BEGIN;
    DELETE FROM predictions WHERE dataset = '{dataset}';
    COMMIT;
    '''.format(
        dataset=dataset
    )
)

with ThreadPoolExecutor(max_workers=5) as executor:
    results = executor.map(
        lambda record_id:
        get_prediction(
                dataset=dataset,
                record_id=record_id,
                model_id=model_id,
                epoch=epoch,
                port=datasets_port
            ),
            record_ids
    )

execute_sql('''
    BEGIN;
    DELETE FROM live_prediction_sync WHERE dataset = '{dataset}';
    COMMIT;
    '''.format(
    dataset=dataset
    )
)

print('Finished')