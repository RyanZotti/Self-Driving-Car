import keras
import numpy as np
from random import shuffle

from ai.transformations import process_data_continuous


class DataGenerator(keras.utils.Sequence):

    'Generates data for Keras'
    def __init__(
        self, record_reader, partition_type, image_scale, crop_percent, batch_size
    ):

        """
        Used to send data to Keras models

        Parameters
        ----------
        record_reader : ai.record_reader.RecordReader
            The class that creates training and validation partitions and that
            has various data utility methods. The RecordReader class is part
            of my legacy codebase back when I used an early version of
            Tensorflow and had to do a bunch of data processing with my own
            classes. The DataGenerator is mostly a wrapper for the RecordReader
            wrapper
        partition_type: str
            Must be either 'train' or 'validation'
        image_scale: int
            Essentially divide an image by this number to get the new size.
            Example: 8
        crop_percent: int
            The percentage of the top portion of the image that should be taken
            off. Through trial an error this has proven to be an effective
            technique. Other drivers have come to the same conclusion. Nothing
            of importance happens in the top half the image. The top half only
            contains distractions. The model performs better if it has zero
            chance of fitting to that source of randomness
            Example: 50
        batch_size: int
            The number of images that the model architecture should expect
            during training
            Example: 32

        """

        assert(partition_type in ['train', 'validation'])

        """
        My image processing pipeline pipeline always doubles the
        number of images and labels because it flips them about the
        vertical axis, so in this class I refer to the batch size
        as half of what the neural network architecture expects it
        to be
        """
        self.batch_size = int(batch_size / 2)

        self.partition_type = partition_type
        self.image_scale = image_scale
        self.crop_percent = crop_percent
        self.height_pixels = int((240 * (self.crop_percent / 100.0)) / self.image_scale)
        self.width_pixels = int(320 / self.image_scale)
        self.record_reader = record_reader
        if self.partition_type == 'train':
            self.label_file_paths = self.record_reader.train_paths
        else:
            self.label_file_paths = self.record_reader.validation_paths
        self.on_epoch_end()

    def __len__(self):
        'Denotes the number of batches per epoch'
        return int(len(self.label_file_paths) / self.batch_size)

    def __getitem__(self, index):
        'Generate one batch of data'
        # Generate indexes of the batch
        label_file_paths = self.label_file_paths[index*self.batch_size:(index+1)*self.batch_size]

        # Generate data
        X, y = self.__data_generation(label_file_paths)

        return X, y

    def on_epoch_end(self):
        'Updates indexes after each epoch'
        shuffle(self.label_file_paths)

    def __data_generation(self, label_file_paths):
        'Generates data containing batch_size samples'
        images, labels = [], []
        for label_file_path in label_file_paths:
            image, angle = self.record_reader.read_record(
                label_path=label_file_path
            )
            images.append(image)
            labels.append([angle])
        list_of_images, list_of_labels = process_data_continuous(
            data=(np.array(images), np.array(labels)),
            image_scale=self.image_scale,
            crop_percent=self.crop_percent)
        images = np.array(list_of_images)
        labels = np.array(list_of_labels)
        return (images, labels)
