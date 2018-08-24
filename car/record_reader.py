import cv2
import glob
import json
import operator
from os.path import dirname, join, basename
import numpy as np
from random import shuffle
import re


class RecordReader(object):

    """
    A class that reads records from disk, partitions them
    into training and test sets and passes them as randomized
    batches to a model trainer.
    """

    def __init__(self,base_directory,batch_size=50,overfit=False,angle_only=False):

        """
        Create a RecordReader object

        Parameters
        ----------
        base_directory : string
            The absolute path to the directory immediately above the
            dataset folders. For example /root/data. RecordReader expects
            to find folders like dataset_1_18-04-15, dataset_1_18-04-15,
            etc. in the base directory that you specify
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
        """

        self.base_directory = base_directory
        self.folders = glob.glob(join(self.base_directory,'*'))
        self.overfit = overfit
        self.angle_only = angle_only

        # Filter out any folder (like tf_visual_data/runs) not related
        # to datasets. Assumes dataset is not elsewhere in the file path
        self.folders = [folder for folder in self.folders if 'dataset' in folder]

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

        # Combine all train folder file paths into single list
        self.train_paths = self.merge_paths(self.train_folders)

        # Combine all test folder file paths into single list
        self.test_paths = self.merge_paths(self.test_folders)
        self.batch_size = batch_size
        self.batches_per_epoch = int(len(self.train_paths) / self.batch_size)

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
        images, labels = self.get_batch(self.test_paths)
        return  (images, labels)

    # Used in Trainer class to know when epoch is reached
    def get_batches_per_epoch(self):
        return self.batches_per_epoch

    # Used by editor API to keep track of records
    def get_dataset_record_ids(self,dataset_name):
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
    def get_dataset_names(self,file_paths):
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