import argparse
from concurrent.futures import ThreadPoolExecutor
import cv2
from datetime import datetime
import json
import numpy as np
import os
import pandas as pd
import random
import sys
import time
import tornado.ioloop
import tornado.web
import tornado.gen


"""
I previously defined the Dataset class outside of the
server.py script. I would import into server.py using
'from car.parts.record_tracker import datastore', but
because the Dockerfile exists below the car folder,
and because Python wants the full import path (relative
paths were not allowed), I had to skip importing custom
packages and define whatever I needed in the server file
itself. I think this problem only exists if the Dockerfile
sits in the middle of the import path. If the root of
the package is defined where the Dockerfile is, then it's
not necessary to put everything in one file. I couldn't
break up the long import path because I wanted to be
able to import the record_tracker client.py file in the
car.start.py script and I wanted all of the record tracker
files to be in the same record_tracker folder.
"""
class Dataset(object):

    def __init__(self, path, inputs=None, types=None):

        self.path = os.path.expanduser(path)
        self.meta_path = os.path.join(self.path, 'meta.json')
        self.df = None
        exists = os.path.exists(self.path)

        """
        This is a hack Ryan did without fully understanding
        how the Donkeycar datastore.py code works, but it
        was intended to fix a bug
        """
        self.input_type_map = dict(zip(inputs, types))

        if exists:
            # load log and meta
            print("Dataset exists: {}".format(self.path))
            with open(self.meta_path, 'r') as f:
                self.meta = json.load(f)
            self.current_ix = self.get_last_ix() + 1

        elif not exists and inputs:
            print('Dataset does NOT exist. Creating new dataset...')
            # create log and save meta
            os.makedirs(self.path)
            self.meta = {'inputs': inputs, 'types': types}
            with open(self.meta_path, 'w') as f:
                json.dump(self.meta, f)
            self.current_ix = 0
            print('New dataset created at: {}'.format(self.path))
        else:
            msg = "The dataset path you provided doesn't exist and you didnt pass any meta info (inputs & types)" + \
                  "to create a new dataset. Please check your dataset path or provide meta info to create a new dataset."

            raise AttributeError(msg)

        self.start_time = time.time()

    def get_last_ix(self):
        index = self.get_index()
        return max(index)

    def update_df(self):
        df = pd.DataFrame([self.get_json_record(i) for i in self.get_index(shuffled=False)])
        self.df = df

    def get_df(self):
        if self.df is None:
            self.update_df()
        return self.df

    def get_index(self, shuffled=True):
        files = next(os.walk(self.path))[2]
        record_files = [f for f in files if f[:6] == 'record']

        def get_file_ix(file_name):
            try:
                name = file_name.split('.')[0]
                num = int(name.split('_')[1])
            except:
                num = 0
            return num

        nums = [get_file_ix(f) for f in record_files]

        if shuffled:
            random.shuffle(nums)
        else:
            nums = sorted(nums)

        return nums

    def get_input_type(self, key):
        return self.input_type_map[key]

    def write_json_record(self, json_data):
        path = self.get_json_record_path(self.current_ix)
        try:
            with open(path, 'w') as fp:
                json.dump(json_data, fp)
                # print('wrote record:', json_data)
        except TypeError:
            print('troubles with record:', json_data)
        except FileNotFoundError:
            raise
        except:
            print("Unexpected error:", sys.exc_info()[0])
            raise

    def get_num_records(self):
        import glob
        files = glob.glob(os.path.join(self.path, 'record_*.json'))
        return len(files)

    def make_record_paths_absolute(self, record_dict):
        # make paths absolute
        d = {}
        for k, v in record_dict.items():
            if type(v) == str:  # filename
                if '.' in v:
                    v = os.path.join(self.path, v)
            d[k] = v

        return d

    def remove_record(self, ix):
        '''
        remove data associate with a record
        '''
        record = self.get_json_record_path(ix)
        os.unlink(record)

    def put_record(self, data):
        """
        Save values like images that can't be saved in the csv log and
        return a record with references to the saved values that can
        be saved in a csv.
        """
        json_data = {}
        self.current_ix += 1

        for key, val in data.items():
            typ = self.get_input_type(key)

            if typ in ['str', 'float', 'int', 'boolean']:
                json_data[key] = val

            elif typ == 'image_array':
                name = self.make_file_name(key, ext='.png')
                absolute_path = os.path.join(self.path, name)
                cv2.imwrite(absolute_path, val)
                json_data[key] = name

            else:
                msg = 'Dataset does not know what to do with this type {}'.format(typ)
                raise TypeError(msg)

        self.write_json_record(json_data)
        return self.current_ix

    def get_json_record_path(self, ix):
        return os.path.join(self.path, 'record_' + str(ix) + '.json')

    def get_json_record(self, ix):
        path = self.get_json_record_path(ix)
        try:
            with open(path, 'r') as fp:
                json_data = json.load(fp)
        except UnicodeDecodeError:
            raise Exception('bad record: %d. You may want to run `python manage.py check --fix`' % ix)
        except FileNotFoundError:
            raise
        except:
            print("Unexpected error:", sys.exc_info()[0])
            raise

        record_dict = self.make_record_paths_absolute(json_data)
        return record_dict

    def make_file_name(self, key, ext='.png'):
        name = '_'.join([str(self.current_ix), key, ext])
        name = name = name.replace('/', '-')
        return name

    def delete(self):
        """ Delete the folder and files for this dataset. """
        import shutil
        shutil.rmtree(self.path)

class DatasetWriter(Dataset):
    def __init__(self, *args, **kwargs):
        super(DatasetWriter, self).__init__(*args, **kwargs)

    def run(self, *args):
        '''
        API function needed to use as a Donkey part.
        Accepts values, pairs them with their inputs keys and saves them
        to disk.
        '''
        assert len(self.inputs) == len(args)

        self.record_time = int(time.time() - self.start_time)
        record = dict(zip(self.inputs, args))
        self.put_record(record)


class DatasetHandler():
    def __init__(self, path):
        self.path = os.path.expanduser(path)

        # Create dir if it doesn't exist
        if not os.path.exists(self.path):
            os.makedirs(self.path)

    def get_dataset_list(self, path):
        folders = next(os.walk(path))[1]
        return folders

    def next_dataset_number(self):
        def get_dataset_num(dataset_name):
            try:
                num = int(dataset_name.split('_')[1])
            except:
                num = 0
            return num

        folders = self.get_dataset_list(self.path)
        numbers = [get_dataset_num(x) for x in folders]
        # numbers = [i for i in numbers if i is not None]
        next_number = max(numbers + [0]) + 1
        return next_number

    def next_dataset_name(self):
        dataset_num = self.next_dataset_number()
        date = datetime.now().strftime('%y-%m-%d')
        name = '_'.join(['dataset', str(dataset_num), date])
        return name

    def new_dataset_writer(self, inputs, types, path):
        dataset_writer = DatasetWriter(path=path, inputs=inputs, types=types)
        return dataset_writer


class WriteRecord(tornado.web.RequestHandler):

    def post(self):
        print('{timestamp} - Writing a record'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        data = self.application.labels.copy()
        data['camera/image_array'] = self.application.image
        self.application.dataset_writer.put_record(data=data)
        # Clear the cache:
        self.application.image = None
        self.application.labels = None
        self.write({})


class GetNextDatasetName(tornado.web.RequestHandler):

    """
    Returns what the next dataset would be, if it were created. Not to
    be confused with actually creating a new dataset, however. I want
    to separate the lookup from the creation because I need to pass a
    dataset name to the UI when the user first visits the dashboard,
    and if the user doesn't start recording data but frequently moves
    across pages, I don't want to end up with a bunch of empty dataset
    folders on the Pi
    """

    def get(self):
        next_dataset_name = self.application.dataset_handler.next_dataset_name()
        self.write({'dataset': next_dataset_name})


class CreateNewDataset(tornado.web.RequestHandler):

    """
    Creates a new dataset
    """

    def post(self):
        next_dataset_name = self.application.dataset_handler.next_dataset_name()
        dataset_path_and_name = os.path.join(self.application.dataset_base_directory, next_dataset_name)
        dataset_writer = self.application.dataset_handler.new_dataset_writer(
            inputs=input_names,
            types=input_types,
            path=dataset_path_and_name
        )
        self.application.dataset_writer = dataset_writer
        app.dataset_name = next_dataset_name
        self.write({'dataset': next_dataset_name})


class GetCurrentDatasetName(tornado.web.RequestHandler):

    """
    Returns the name of the dataset that you would end up
    writing to if you tried to write a record
    """

    def get(self):
        print(self.application.dataset_name)
        self.write({'dataset': self.application.dataset_name})


# Updates image cache
class ImageCache(tornado.web.RequestHandler):

    def post(self):
        print('{timestamp} - Updating image cache'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        # I don't quite understand how this works. "image" is what
        # I called the key of the dict in the request json but
        # I think "body" is a built-in Tornado thing in the
        # tornado.HTTPFile class. Anyways, it works.
        file_body = self.request.files['image'][0]['body']
        nparr = np.fromstring(file_body, np.uint8)
        self.application.image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        self.write({})

# Updates non-image cache
class RecordCache(tornado.web.RequestHandler):

    def post(self):
        print('{timestamp} - Updating non-image cache'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        json_input = tornado.escape.json_decode(self.request.body)
        self.application.labels = json_input
        self.write({})

class SetDatasetBaseDirectory(tornado.web.RequestHandler):
    """
    Updates the directory that will contain all of the
    dataset folders
    """
    def post(self):
        json_input = tornado.escape.json_decode(self.request.body)
        """
        Increment and create a new dataset folder if the parent
        directory changes, but make sure you increment the dataset
        name while you can still look at the dataset IDs that
        already exist. You want to avoid a situation that looks
        like old/dir/dataset-1 new/dir/dataset-1 when instead the
        new dataset should look like new/dir/dataset-2
        """
        dataset_name = self.application.dataset_handler.next_dataset_name()
        self.application.dataset_base_directory = json_input['directory']
        os.makedirs(self.application.dataset_base_directory, exist_ok=True)
        self.application.dataset_handler = DatasetHandler(
            path=self.application.dataset_base_directory
        )
        new_datset_path = os.path.join(self.application.dataset_base_directory, dataset_name)
        dataset_writer = self.application.dataset_handler.new_dataset_writer(
            inputs=input_names,
            types=input_types,
            path=new_datset_path
        )
        self.application.dataset_writer = dataset_writer
        self.application.dataset_name = dataset_name
        self.write({})

class GetDatasetBaseDirectory(tornado.web.RequestHandler):
    """
    Returns the directory that contains all of the dataset
    folders
    """
    def get(self):
        self.write({'directory': self.application.dataset_base_directory})


class Health(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def is_healthy(self):
        result = {
            'is_healthy': True
        }
        return result

    @tornado.gen.coroutine
    def get(self):
        result = yield self.is_healthy()
        self.write(result)

def make_app():
    handlers = [
        (r"/write-record", WriteRecord),
        (r"/image", ImageCache),
        (r"/labels", RecordCache),
        (r"/create-new-dataset", CreateNewDataset),
        (r"/get-next-dataset-name", GetNextDatasetName),
        (r"/get-current-dataset-name", GetCurrentDatasetName),
        (r"/set-dataset-base-directory", SetDatasetBaseDirectory),
        (r"/get-dataset-base-directory", GetDatasetBaseDirectory),
        (r"/health", Health)
    ]
    return tornado.web.Application(handlers)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--port",
        required=False,
        help="Server port to use",
        default=8093
    )
    ap.add_argument(
        "--directory",
        required=False,
        help="Directory for all datesets. Can be updated via API too",
        default='~/vehicle-datasets'
    )
    args = vars(ap.parse_args())
    port = args['port']
    dataset_base_directory = args['directory']
    os.makedirs(dataset_base_directory, exist_ok=True)

    app = make_app()
    app.dataset_base_directory = dataset_base_directory
    app.dataset_handler = DatasetHandler(path=app.dataset_base_directory)
    # TODO: Make sure this always matches what's in start.py or you'll get key not found bugs
    input_names = [
        'camera/image_array',
        'ps3_controller/angle',
        'ps3_controller/recording',
        'ps3_controller/throttle'
    ]
    input_types = [
        'image_array',
        'float',
        'boolean',
        'float'
    ]
    app.image = None
    app.record = None
    app.dataset = None

    """
    This will always create a new dataset when the server starts
    up, but it avoids the edge case of possibly writing to the last
    dataset from the last time you recorded something, which could
    have been a really long time ago (e.g., weeks). It is a bit
    annoying to delete empty datasets if you frequently restart the
    server, but under ideal conditions I don't expect to restart the
    server frequently. If I do have to frequently restart the server,
    I made it easy to delete empty datasets from the UI
    """
    dataset_name = app.dataset_handler.next_dataset_name()
    app.dataset_name = dataset_name
    new_datset_path = os.path.join(app.dataset_base_directory, app.dataset_name)
    dataset_writer = app.dataset_handler.new_dataset_writer(
        inputs=input_names,
        types=input_types,
        path=new_datset_path
    )
    app.dataset_writer = dataset_writer


    app.listen(port)
    tornado.ioloop.IOLoop.current().start()
