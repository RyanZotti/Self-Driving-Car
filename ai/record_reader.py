import cv2
import glob
import json
from os.path import dirname, join
import numpy as np
from random import shuffle


# Used to feed data to models for training
class RecordReader(object):

    # Assumes folders is a list of absolute file paths
    def __init__(self,folders,batch_size=50):

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

        return image, angle, throttle

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
