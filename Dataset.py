import os
import numpy as np
from random import shuffle
import random
from util import shuffle_dataset, summarize_metadata, sanitize_data_folders
from multiprocessing import Process, Queue, Event
from data_augmentation import process_data


class Dataset:

    def __init__(self,input_file_path,images_per_batch=50,train_percentage=0.8, max_sample_records=50):
        self.input_file_path = input_file_path
        folders = os.listdir(self.input_file_path)
        folders = sanitize_data_folders(folders)
        self.train_folders, self.test_folders = Dataset.train_test_split(folders)
        self.train_percentage = train_percentage
        self.max_sample_records = max_sample_records
        self.train_metadata_summaries, self.train_metadata = summarize_metadata(self.input_file_path,self.train_folders)
        self.train_folder_weights = self.get_folder_weights(self.train_folders)
        self.test_metadata_summaries, self.test_metadata = summarize_metadata(self.input_file_path, self.test_folders)
        self.test_folder_weights = self.get_folder_weights(self.test_folders)
        self.images_per_batch = images_per_batch
        self.images_per_epoch = int(self.train_metadata_summaries['image_count'] * self.train_percentage)
        self.samples_per_epoch = int(self.images_per_epoch / self.max_sample_records)
        self.train_batches = MultiTaskBatchManager(self.train_folders, self.train_folder_weights, self.train_metadata_summaries['image_count'], self.input_file_path)
        self.test_batches = MultiTaskBatchManager(self.test_folders, self.test_folder_weights, self.test_metadata_summaries['image_count'], self.input_file_path)

    # TODO (ryanzotti): Make this asynchronous to parallelize disk reads during GPU/CPU train_step cycles
    def get_sample(self,train=True):
        if train:
            folders = self.train_folders
        else:
            folders = self.test_folders
        folders_per_batch = 10
        images = []
        labels = []
        for _ in range(folders_per_batch):
            folder = self.get_weighted_random_folder(folders)
            folder_path = self.input_file_path + '/' + str(folder) + '/predictors_and_targets.npz'
            npzfile = np.load(folder_path)
            images.extend(npzfile['predictors'])
            labels.extend(npzfile['targets'])
            if len(images) > self.max_sample_records:
                images, labels = self.reduce_record_count(images, labels)
                return images, labels
        images = np.array(images)
        labels = np.array(labels)
        images, labels = shuffle_dataset(images,labels)
        return process_data(images, labels)

    def get_folder_weights(self,folders):
        folder_weights = {}
        metadata_summaries, folder_metadata = summarize_metadata(self.input_file_path, include_folders=folders)
        images_processed = 0
        for folder, metadata in folder_metadata.items():
            upper_bound = images_processed + metadata['image_count']
            folder_weights[folder] = {'lower_bound': images_processed,
                                      'upper_bound': upper_bound,
                                      'weight': metadata['image_count'] / metadata_summaries['image_count']}
            images_processed = upper_bound
        return folder_weights

    def get_weighted_random_folder(self,is_train=True):
        if is_train:
            folder_weights = self.train_folder_weights
            image_count = self.train_metadata_summaries['image_count']
        else:
            folder_weights = self.test_folder_weights
            image_count = self.test_metadata_summaries['image_count']
        random_image_index = random.randint(0, image_count)
        for folder, folder_data in folder_weights.items():
            if folder_data['lower_bound'] <= random_image_index < folder_data['upper_bound']:
                return folder

    # Fixes GPU memory problem when I consume large files
    def reduce_record_count(self, images, labels):
        index = np.random.choice(len(images), self.max_sample_records, replace=False)
        return np.array(images)[index], np.array(labels)[index]

    def batchify(self,sample):
        images, labels = sample[0], sample[1]
        batches_in_sample = int(len(images) / self.images_per_batch)  # Round down to avoid out of index errors
        for batch_index in range(batches_in_sample):
            batch_start = batch_index * self.images_per_batch
            batch_end = (batch_index + 1) * self.images_per_batch
            yield images[batch_start:batch_end], labels[batch_start:batch_end]

    def train_test_split(folders):
        shuffle(folders)
        train_folder_size = int(len(folders) * 0.8)
        train = [folder for folder in folders[:train_folder_size]]
        test = list(set(folders) - set(train))
        return train, test

    def get_batches(self,train=True):
        n_batches = int(self.images_per_epoch / self.images_per_batch)
        for _ in range(n_batches):
            yield self.get_multiprocess_sample(train=train)

    def get_multiprocess_sample(self, train=True):
        if train:
            return self.train_batches.next_batch()
        else:
            return self.test_batches.next_batch()


def get_weighted_random_folder(folder_weights, image_count):
    random_image_index = random.randint(0, image_count)
    for folder, folder_data in folder_weights.items():
        if folder_data['lower_bound'] <= random_image_index < folder_data['upper_bound']:
            return folder


def reduce_record_count(images, labels):
    index = np.random.choice(len(images), 50, replace=False)
    return np.array(images)[index], np.array(labels)[index]


class SingleBatchGenerator(Process):

    def __init__(self, single_task_q: Queue, stop_event: Event, folders, folder_weights, image_count, input_file_path):
        super().__init__()
        self.done_q = single_task_q
        self.stop_event = stop_event
        self.folders = folders
        self.folder_weights = folder_weights
        self.image_count = image_count
        self.input_file_path = input_file_path

    # bucketing, padding sequences; and transforming, normalizing labelling matrix
    def next_batch(self):
        images = []
        labels = []
        folder = get_weighted_random_folder(self.folder_weights, self.image_count)
        folder_path = self.input_file_path + '/' + str(folder) + '/predictors_and_targets.npz'
        npzfile = np.load(folder_path)
        images.extend(npzfile['predictors'])
        labels.extend(npzfile['targets'])
        images, labels = reduce_record_count(images, labels)
        images, labels = shuffle_dataset(images, labels)
        images, labels = process_data([images, labels], folder_path)
        return images, labels


    def run(self):
        while not self.stop_event.is_set():
            if not self.done_q.full():
                self.done_q.put(self.next_batch())


class BatchAggregator(Process):

    def __init__(self, single_task_q: Queue, multi_task_q: Queue, stop_event: Event):
        super().__init__()
        self.pending_q = single_task_q
        self.done_q = multi_task_q
        self.stop_event = stop_event

    def run(self):
        while not self.stop_event.is_set():
            if not self.done_q.full():
                st_batch = self.pending_q.get()
                self.done_q.put(st_batch)


class MultiTaskBatchManager:

    def __init__(self, folders, folder_weights, image_count, input_file_path):
        MAX_CAPACITY = 5
        self.folders = folders
        self.folder_weights = folder_weights
        self.image_count = image_count
        self.input_file_path = input_file_path
        self.stop_event = Event()
        self.single_task_q = Queue(MAX_CAPACITY)
        self.multi_task_train_q = Queue(MAX_CAPACITY)
        self.batch_aggregator = BatchAggregator(self.single_task_q, self.multi_task_train_q, self.stop_event)
        self.batch_generator = SingleBatchGenerator(self.single_task_q, self.stop_event, self.folders, self.folder_weights, self.image_count, self.input_file_path)
        self.batch_generator.start()
        self.batch_aggregator.start()

    def next_batch(self):
        return self.multi_task_train_q.get()

    def close(self, timeout: int = 5):
        self.stop_event.set()

        self.batch_generator.join(timeout=timeout)
        self.batch_generator.terminate()

        self.batch_aggregator.join(timeout=timeout)
        self.batch_aggregator.terminate()