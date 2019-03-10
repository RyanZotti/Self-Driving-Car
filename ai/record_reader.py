import cv2
from datetime import datetime
import glob
import json
import operator
from os.path import dirname, join, basename
import numpy as np
from random import shuffle
import re
from shutil import rmtree

from ai.utilities import get_sql_rows, execute_sql, mkdir


class RecordReader(object):

    """
    A class that reads records from disk, partitions them
    into training and test sets and passes them as randomized
    batches to a model trainer.
    """

    def __init__(self,base_directory,batch_size=50,overfit=False,angle_only=False,is_for_model=False):

        """
        Create a RecordReader object

        Parameters
        ----------
        base_directory : string
            The absolute path to the directory immediately above the
            dataset folders. If you have datasets like /root/data/dataset_1_18-04-15
            and /root/data/dataset_1_18-04-15, then your base_directory
            should be /root/data
        batch_size : int
            Number of records per batch. Defaults to 50 records
        overfit : boolean
            Indicates whether the model should be trained and validated
            on the same data. I use this when I'm training on images
            that the model got horribly wrong (or recorded disengagements
            that occurred during a recorded deployment)
        angle_only : boolean
            Whether to focus on angle only. Possibly focuses model's
            attention on the most egregious errors, turning right when
            the car should turn left, etc
        is_for_model : boolean
            Will this be used to feed data to a model, as opposed to an
            API? The API doesn't care about train / validation selections,
            but the model does and pulls the selections from Postgres

        """

        self.base_directory = base_directory
        self.refresh_folders()
        self.overfit = overfit
        self.angle_only = angle_only
        self.is_for_model = is_for_model

        # TODO: Check if this is no longer needed
        # Train and test are the same in overfit mode
        if overfit == True:
            self.train_folders = [folder for folder in self.folders]
            self.test_folders = self.train_folders
        else:
            # Assign folders to either train or test
            shuffle(self.folders)
            train_percentage = 60
            train_folder_size = int(len(self.folders) * (train_percentage / 100))
            self.train_folders = [folder for folder in self.folders[:train_folder_size]]
            self.test_folders = list(set(self.folders) - set(self.train_folders))

        self.train_paths = []
        self.validation_paths = []
        if self.is_for_model == True:
            self.use_train_critical_errors = self.get_toggle_status(
                web_page='machine learning',
                name='critical errors',
                detail='train'
            )
            self.use_train_flag_records = self.get_toggle_status(
                web_page='machine learning',
                name='flagged records',
                detail='train'
            )
            self.train_datasets = self.get_dataset_selections('train')
            self.train_folders = []
            for dataset in self.train_datasets:
                absolute_path = self.get_dataset_absolute_path(dataset)
                self.train_folders.append(absolute_path)
                if self.use_train_critical_errors == True:
                    record_ids = self.get_critical_error_record_ids(
                        dataset_name=dataset
                    )
                    for record_id in record_ids:
                        record_path = self.get_label_path(
                            dataset_name=dataset,
                            record_id = record_id
                        )
                        self.train_paths.append(record_path)
                if self.use_train_flag_records == True:
                    record_ids = self.get_flagged_record_ids(
                        dataset_name=dataset
                    )
                    for record_id in record_ids:
                        record_path = self.get_label_path(
                            dataset_name=dataset,
                            record_id=record_id
                        )
                        self.train_paths.append(record_path)
            self.train_paths = list(set(self.train_paths))

            self.use_validation_critical_errors = self.get_toggle_status(
                web_page='machine learning',
                name='critical errors',
                detail='validation'
            )
            self.use_validation_flag_records = self.get_toggle_status(
                web_page='machine learning',
                name='flagged records',
                detail='validation'
            )
            self.validation_datasets = self.get_dataset_selections('validation')
            for dataset in self.validation_datasets:
                absolute_path = self.get_dataset_absolute_path(dataset)
                self.test_folders.append(absolute_path)
                if self.use_validation_critical_errors == True:
                    record_ids = self.get_critical_error_record_ids(
                        dataset_name=dataset
                    )
                    for record_id in record_ids:
                        record_path = self.get_label_path(
                            dataset_name=dataset,
                            record_id=record_id
                        )
                        self.validation_paths.append(record_path)
                if self.use_validation_flag_records == True:
                    record_ids = self.get_critical_error_record_ids(
                        dataset_name=dataset
                    )
                    for record_id in record_ids:
                        record_path = self.get_label_path(
                            dataset_name=dataset,
                            record_id=record_id
                        )
                        self.validation_paths.append(record_path)

        '''
        If either flagged records or critical errors are selected,
        then I should not use read all records. Otherwise if I
        select everything, there is no emphasis and all records
        have equal probability of being selected
        '''
        # Combine all train folder file paths into single list
        if len(self.train_paths) == 0:
            self.train_paths = self.merge_paths(self.train_folders)

        # Combine all test folder file paths into single list
        if len(self.validation_paths) == 0:
            self.validation_paths = self.merge_paths(self.test_folders)

        self.batch_size = batch_size
        self.batches_per_epoch = int(len(self.train_paths) / self.batch_size)

    def get_toggle_status(self, web_page, name, detail):
        """
        Checks if a user has turned on a given toggle

        Parameters
        ----------
        web_page : string
            The page web where the user would have set the toggle
        name : string
            The type of toggle
        name : string
            Any other details about the toggle

        Returns
        ----------
        is_on : boolean
            Whether the toggle is turned on or not
        """
        sql_query = '''
            DROP TABLE IF EXISTS latest;
            CREATE TEMP TABLE latest AS (
              SELECT
                detail,
                is_on,
                ROW_NUMBER() OVER(
                  PARTITION BY
                    web_page,
                    name,
                    detail
                  ORDER BY
                    event_ts DESC
                ) AS temporal_rank
              FROM toggles
              WHERE LOWER(web_page) LIKE LOWER('%{web_page}%')
                AND LOWER(name) LIKE LOWER('%{name}%')
                AND LOWER(detail) LIKE LOWER('%{detail}%')
            );

            SELECT
              is_on
            FROM latest
            WHERE temporal_rank = 1
              AND is_on = TRUE
        '''.format(
            web_page=web_page,
            name=name,
            detail=detail
        )
        rows = get_sql_rows(sql=sql_query)
        is_on = False
        if len(rows) > 0:
            first_row = rows[0]
            is_on = first_row['is_on']
        return is_on

    # Used when I add folders while driving. Saves me from
    # having to restart the server for the folders to get
    # reflected
    def refresh_folders(self):
        self.folders = glob.glob(join(self.base_directory, '*'))
        # Filter out any folder (like tf_visual_data/runs) not related
        # to datasets. Assumes dataset is not elsewhere in the file path
        self.folders = [folder for folder in self.folders if 'dataset' in folder]

    def write_new_record(self,dataset_name, record_id, angle, throttle, image):
        dataset_path = join(self.base_directory, dataset_name)
        mkdir(dataset_path)  # Does not make dir if already exists
        image_file = '{record_id}_cam-image_array_.png'.format(
            record_id=record_id
        )
        image_path = join(dataset_path, image_file)
        cv2.imwrite(image_path, image)
        label_file = 'record_{id}.json'.format(
            id=record_id
        )
        label_path = join(dataset_path, label_file)
        # TODO: Stop writing label files once everything reads from DB
        label_content = {
            "cam/image_array":image_path,
            "user/throttle": throttle,
            "user/angle": angle
        }
        with open(label_path, 'w') as label_writer:
            json.dump(label_content, label_writer)
        sql_query = '''
            BEGIN;
            INSERT INTO records (
                dataset,
                record_id,
                label_path,
                image_path,
                angle,
                throttle
            )
            VALUES (
               '{dataset}',
                {record_id},
               '{label_path}',
               '{image_path}',
                {angle},
                {throttle}
            );
            COMMIT;
        '''.format(
            dataset=dataset_name,
            record_id=record_id,
            label_path=label_path,
            image_path=image_path,
            angle=angle,
            throttle=throttle
        )
        execute_sql(sql_query)

    def get_dataset_selections(self, dataset_type):
        """
        Gets the user-selected train or validation datasets that are
        stored in Postgres. Users choose their selections in the UI

        Parameters
        ----------
        dataset_type : string
            Whether to pull train or validation datasets. Must be
            either "train" or "validation"
        """
        sql_query = '''
            DROP TABLE IF EXISTS latest;
            CREATE TEMP TABLE latest AS (
              SELECT
                detail,
                is_on,
                ROW_NUMBER() OVER(
                  PARTITION BY
                    web_page,
                    name,
                    detail
                  ORDER BY
                    event_ts DESC
                ) AS temporal_rank
              FROM toggles
              WHERE LOWER(name) LIKE '%{dataset_type}%'
            );

            SELECT
              detail AS dataset
            FROM latest
            WHERE temporal_rank = 1
              AND is_on = TRUE
        '''.format(
            dataset_type=dataset_type
        )
        rows = get_sql_rows(sql=sql_query)
        datasets = []
        if len(rows) > 0:
            for row in rows:
                dataset = row['dataset']
                datasets.append(dataset)
        return datasets

    def get_critical_error_record_ids(self,dataset_name):
        record_ids = []
        sql_query = '''
            DROP TABLE IF EXISTS latest_deployment;
            CREATE TEMP TABLE latest_deployment AS (
              SELECT
                model_id,
                epoch
              FROM deploy
              ORDER BY TIMESTAMP DESC
              LIMIT 1
            );

            SELECT
              records.record_id
            FROM records
            LEFT JOIN predictions
              ON records.dataset = predictions.dataset
                AND records.record_id = predictions.record_id
            LEFT JOIN latest_deployment AS deploy
              ON predictions.model_id = deploy.model_id
                AND predictions.epoch = deploy.epoch
            WHERE LOWER(records.dataset) LIKE LOWER('%{dataset}%')
              AND ABS(records.angle - predictions.angle) >= 0.8
            ORDER BY record_id ASC
            '''.format(dataset=dataset_name)
        rows = get_sql_rows(sql_query)
        for row in rows:
            record_id = row['record_id']
            record_ids.append(record_id)
        return record_ids

    def get_flagged_record_ids(self,dataset_name):
        record_ids = []
        sql_query = '''
            SELECT
              record_id
            FROM records
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%')
              AND is_flagged = TRUE
        '''.format(dataset=dataset_name)
        rows = get_sql_rows(sql_query)
        for row in rows:
            record_id = row['record_id']
            record_ids.append(record_id)
        return record_ids

    def get_flagged_record_count(self, dataset_name):
        count = 0
        sql_query = '''
            SELECT
              COUNT(*) AS count
            FROM records
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%')
              AND is_flagged = TRUE
        '''.format(dataset=dataset_name)
        rows = get_sql_rows(sql_query)
        if len(rows) > 0:
            first_row = rows[0]
            count = first_row['count']
        return count

    def get_dataset_absolute_path(self, dataset_name):
        full_path = join(self.base_directory, dataset_name)
        return full_path

    def write_flag(self, dataset, record_id, is_flagged):
        sql_query = '''
            UPDATE records
            SET is_flagged = {is_flagged}
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%')
              AND record_id = {record_id};
        '''.format(
            dataset=dataset,
            record_id=record_id,
            is_flagged=is_flagged
        )
        execute_sql(sql_query)

    def read_flag(self, dataset, record_id):
        sql_query = '''
            SELECT
              is_flagged
            FROM records
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%')
              AND record_id = {record_id}
        '''.format(
            dataset=dataset,
            record_id=record_id
        )
        rows = get_sql_rows(sql=sql_query)
        is_flagged = False
        if len(rows) > 0:
            first_row = rows[0]
            is_flagged = first_row['is_flagged']
        return is_flagged

    def unflag_dataset(self,dataset):
        sql_query = '''
            UPDATE records
            SET is_flagged = FALSE
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%');
        '''.format(
            dataset=dataset
        )
        execute_sql(sql_query)

    def delete_dataset(self, dataset_name):
        full_path = self.get_dataset_absolute_path(dataset_name)
        sql_query = '''
            DELETE FROM records
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%');
            DELETE FROM predictions
            WHERE LOWER(dataset) LIKE LOWER('%{dataset}%');
        '''.format(
            dataset=dataset_name
        )
        execute_sql(sql_query)
        rmtree(full_path)

    # Merge paths into single numpy array for fast random selection
    def merge_paths(self,folders):
        merged = []
        for folder in folders:
            file_pattern = '{0}/*record*.json'.format(folder)
            file_paths = glob.glob(file_pattern)
            merged = merged + file_paths
        return np.array(merged)

    # Return list of (full_path, file_number) tuples given a folder
    def ordered_label_files(self,folder):
        files = glob.glob(join(folder, 'record*.json'))
        file_numbers = {}
        for file in files:
            number = re.search(r'(?<=record_)(.*)(?=\.json)', file).group(1)
            file_numbers[file] = int(number)
        sorted_files = sorted(file_numbers.items(), key=operator.itemgetter(1))
        return sorted_files

    def get_dataset_name_from_record_path(self,record_path):
        regex = r'(?<=data\/)(.*)(?=\/)'
        dataset_name = re.search(regex, record_path).group(1)
        return dataset_name

    def get_record_id_from_record_path(self, record_path):
        regex = r'(?<=record_)(.*)(?=\.json)'
        record_id = re.search(regex, record_path).group(1)
        return record_id

    # Used by the editor API to show labels
    def get_label_path(self,dataset_name,record_id):
        all_files = self.all_ordered_label_files()
        for file_path, file_record_id in all_files:
            file_dataset_name = self.get_dataset_name_from_record_path(file_path)
            if record_id == file_record_id and dataset_name == file_dataset_name:
                return file_path

    # Used by the editor API
    def get_image_count_from_dataset(self,dataset_name):
        dataset_path = join(self.base_directory, dataset_name)
        glob.glob(join(self.base_directory, dataset_name))
        file_pattern = '{0}/*.png'.format(dataset_path)
        file_paths = glob.glob(file_pattern)
        return len(file_paths)

    def get_dataset_id_from_dataset_name(self, dataset_name):
        regex = r'(?<=dataset_)(.*)(?=\_)'
        dataset_id = re.search(regex, dataset_name).group(1)
        return dataset_id

    def get_dataset_date_from_dataset_name(self, dataset_name):
        regex = r'dataset_[0-9]+_(.*)'
        date_str = re.search(regex, dataset_name).group(1)
        date_dt = datetime.strptime(date_str, '%y-%m-%d')
        new_date_str = date_dt.strftime("%Y-%m-%d")
        return new_date_str

    def ordered_folders(self,folders):
        ordered_numbers = []
        for folder in folders:
            folder_number = int(re.search(r'(?<=dataset_)([0-9]*)(?=_)', folder).group(1))
            ordered_numbers.append(folder_number)
        ordered_numbers.sort()
        ordered_folders = []
        for number in ordered_numbers:
            for folder in folders:
                pattern = 'dataset_'+str(number)+'_'
                if pattern in folder:
                    ordered_folders.append(folder)
                    break
        return ordered_folders

    # Makes it easy to go through every single file. Primarily used
    # for editing files. Defaults to all folders but has option to
    # go through just some folders, like training
    def all_ordered_label_files(self,folders=None):
        if folders is None:
            folders = self.folders
        ordered_folders = self.ordered_folders(folders)
        for folder in ordered_folders:
            files = self.ordered_label_files(folder)
            for file in files:
                yield file

    # Used by the editor API
    def get_image_path(self,dataset_name,record_id):
        dataset_path = join(self.base_directory, dataset_name)
        image_path = join(dataset_path, '{record_id}_cam-image_array_.png'.format(
            record_id=record_id))
        return image_path

    # Used by the editor API
    def get_image(self,dataset_name,record_id):
        dataset_path = join(self.base_directory, dataset_name)
        image_path = join(dataset_path,'{record_id}_cam-image_array_.png'.format(
            record_id=record_id))
        frame = cv2.imread(image_path)
        return frame

    # Used in validate_deployment.py
    def image_path_from_label_path(self,label_path):
        # Parse JSON file
        with open(label_path, 'r') as f:
            contents = json.load(f)
        image_file = contents['cam/image_array']
        folder_path = dirname(label_path)
        image_path = join(folder_path, image_file)
        return image_path

    # Read both labels and image data.
    # This is written as a function so that it can
    # be parallelized in a map for speed
    def read_record(self, label_path):

        # Parse JSON file
        with open(label_path, 'r') as f:
            contents = json.load(f)

        # Extract file contents
        angle = contents['user/angle']
        throttle = contents['user/throttle']
        image_path = self.image_path_from_label_path(label_path)

        # Read image. OpenCV interprets 1 as RGB
        image = cv2.imread(image_path, 1)

        # Fixes a critical bug
        # Image passed via post request to Tornado gets converted
        # this way, which results in a very slight change (slight
        # blurring) that unfortunately drastically changes the
        # model's prediction. This code makes sure that what the
        # model sees during training matches what it sees during
        # deployment
        hardcoded_image = cv2.imencode('.jpg', image)[1].tostring()
        nparr = np.fromstring(hardcoded_image, np.uint8)
        api_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if self.angle_only == True:
            return api_image, angle
        else:
            return api_image, angle, throttle

    # Returns batch of label and image pairs
    def get_batch(self,all_paths):

        # Select paths at random
        random_paths = list(np.random.choice(
            all_paths, self.batch_size, replace=False))

        # Parallelize using a map (vs. for-loop) for faster reads
        records = list(map(self.read_record, random_paths))

        # Sort into images and labels
        images, labels = [], []
        for record in records:
            if self.angle_only == True:
                image, angle = record
                images.append(image)
                labels.append([angle])
            else:
                image, angle, throttle = record
                images.append(image)
                labels.append([angle, throttle])
        images = np.array(images)
        labels = np.array(labels)
        return (images, labels)

    # Get train batch
    def get_train_batch(self):
        images, labels = self.get_batch(self.train_paths)
        return (images, labels)

    # Get test batch
    def get_test_batch(self):
        images, labels = self.get_batch(self.validation_paths)
        return  (images, labels)

    # Used in Trainer class to know when epoch is reached
    def get_batches_per_epoch(self):
        return self.batches_per_epoch

    # Used by editor API to keep track of records via DB
    def get_dataset_record_ids(self,dataset_name):
        record_ids = []
        sql_query = '''
            SELECT
              record_id
            FROM records
            WHERE UPPER(dataset) LIKE UPPER('{dataset_name}')
            ORDER BY record_id ASC
        '''.format(
            dataset_name=dataset_name
        )
        rows = get_sql_rows(sql=sql_query)
        for row in rows:
            record_id = row['record_id']
            record_ids.append(record_id)
        return record_ids

    # Used by editor API to keep track of records via filesystem
    def get_dataset_record_ids_filesystem(self, dataset_name):
        dataset_path = join(self.base_directory, dataset_name)
        files = glob.glob(join(dataset_path, 'record*.json'))
        file_numbers = {}
        for file in files:
            number = self.get_record_id_from_record_path(file)
            file_numbers[file] = int(number)
        sorted_files = sorted(file_numbers.items(), key=operator.itemgetter(1))
        return sorted_files

    # Used by editor API to show editable datasets
    # This also returns the datasets in order
    def get_dataset_names(self):
        ordered_datasets = []
        id_to_dataset = {}
        sql_query = '''
            SELECT DISTINCT
              dataset
            FROM records
            ORDER BY dataset ASC
        '''
        rows = get_sql_rows(sql=sql_query)
        for row in rows:
            dataset = row['dataset']
            number = int(re.search(r'(?<=dataset_)([0-9]*)(?=_)', dataset).group(1))
            id_to_dataset[number] = dataset
        sorted_tuples = sorted(id_to_dataset.items(), key=operator.itemgetter(0))
        for number, dataset in sorted_tuples:
            ordered_datasets.append(dataset)
        return ordered_datasets

    def get_dataset_names_filesystem(self, file_paths):
        ordered_datasets = []
        id_to_dataset = {}
        for file_path in file_paths:
            dataset = basename(file_path)
            number = int(re.search(r'(?<=dataset_)([0-9]*)(?=_)', dataset).group(1))
            id_to_dataset[number] = dataset
        sorted_tuples = sorted(id_to_dataset.items(), key=operator.itemgetter(0))
        for number, dataset in sorted_tuples:
            ordered_datasets.append(dataset)
        return ordered_datasets