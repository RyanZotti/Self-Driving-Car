import os
from car.record_reader import RecordReader


data_path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data'
record_reader = RecordReader(base_directory=data_path)
all_files = iter(record_reader.all_ordered_label_files())

for data in all_files:
    label_path, _ = data
    image_path = record_reader.image_path_from_label_path(label_path)
    _, angle, throttle = record_reader.read_record(label_path=label_path)
    if throttle == 0:
        print(throttle)
        print(image_path)
        print(label_path)
        os.remove(label_path)
        os.remove(image_path)
