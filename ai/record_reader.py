import cv2
import glob
import json
from os.path import dirname, join
import numpy as np
from random import shuffle


class RecordReader(object):

    """
    A class that reads records from disk, partitions them
    into training and test sets and passes them as randomized
    batches to a model trainer.
    """

    def __init__(self,base_directory,batch_size=50):

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
        """

        self.base_directory = base_directory
        folders = glob.glob(join(self.base_directory,'*'))

        # Filter out any folder (like tf_visual_data/runs) not related
        # to datasets. Assumes dataset is not elsewhere in the file path
        folders = [folder for folder in folders if 'dataset' in folder]

        # Assign folders to either train or test
        shuffle(folders)
        train_percentage = 60
        train_folder_size = int(len(folders) * (train_percentage/100))
        self.train_folders = [folder for folder in folders[:train_folder_size]]
        self.test_folders = list(set(folders) - set(self.train_folders))

        # Combine all train folder file paths into single list
        self.train_paths = self.merge_paths(self.test_folders)

        # Combine all test folder file paths into single list
        self.test_paths = self.merge_paths(self.test_folders)

        self.batch_size = batch_size
        self.batches_per_epoch = int(len(self.train_paths) / self.batch_size)

    # Merge paths into single numpy array for fast random selection
    def merge_paths(self,folders):
        merged = []
        for folder in folders:
            file_pattern = '{0}/record*.json'.format(folder)
            file_paths = glob.glob(file_pattern)
            merged = merged + file_paths
        return np.array(merged)

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
        image_file = contents['cam/image_array']
        folder_path = dirname(label_path)
        image_path = join(folder_path,image_file)

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

        return api_image, angle, throttle

    # Returns batch of label and image pairs
    def get_batch(self,all_paths,is_train=False):

        # Select paths at random
        random_paths = list(np.random.choice(
            all_paths, self.batch_size, replace=False))

        if is_train == True:
            print(random_paths)

        # Parallelize using a map (vs. for-loop) for faster reads
        records = list(map(self.read_record, random_paths))

        # Sort into images and labels
        images, labels = [], []
        for record in records:
            image, angle, throttle = record
            images.append(image)
            labels.append([angle, throttle])
        images = np.array(images)
        labels = np.array(labels)
        return (images, labels)

    # Get train batch
    def get_train_batch(self):
        images, labels = self.get_batch(self.train_paths,is_train=True)
        return (images, labels)

    # Get test batch
    def get_test_batch(self):
        images, labels = self.get_batch(self.test_paths)
        return  (images, labels)

    # Used in Trainer class to know when epoch is reached
    def get_batches_per_epoch(self):
        return self.batches_per_epoch
