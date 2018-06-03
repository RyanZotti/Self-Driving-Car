import argparse
from util import *
from ai.record_reader import RecordReader
from data_augmentation import apply_transformations


ap = argparse.ArgumentParser()
ap.add_argument(
    "--checkpoint_dir",
    required=False,
    help="path to all of the data",
    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/tf_visual_data/runs/4/checkpoints')
ap.add_argument(
    "--data_path",
    required=False,
    help="path to all of the data",
    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data')
ap.add_argument(
    "--image_scale",
    required=False,
    help="Resize image scale",
    default=0.0625)
ap.add_argument(
    "--label_path",
    required=False,
    help="Where to find a single image to compare predictions",
    default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_2_18-04-15/record_845.json')
ap.add_argument(
    "--port",
    required=False,
    help="Serer port to use",
    default=8888)

args = vars(ap.parse_args())
checkpoint_dir = args['checkpoint_dir']
data_path = args['data_path']
image_scale = args['image_scale']
label_path = args['label_path']
port=args['port']

# Run prediction API as a subprocess
cmd = '''
    python ../prediction_api.py \
        --checkpoint_dir {checkpoint_dir} \
        --image_scale {image_scale} \
        --port {port}
    '''.format(
        checkpoint_dir=checkpoint_dir,
        image_scale=image_scale,
        port=port)
api_process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)

# Load model just once and store in memory for all future calls
sess, x, prediction = load_model(checkpoint_dir)

record_reader = RecordReader(base_directory=data_path)
image, _, _ = record_reader.read_record(label_path)

# TODO: Fix this bug. Right now if I don't pass mirror image, model outputs unchanging prediction
flipped_image = cv2.flip(image, 1)
normalized_images = [image, flipped_image]
normalized_images = np.array(normalized_images)

# Normalize for contrast and pixel size
normalized_images = apply_transformations(
    images=normalized_images,
    image_scale=image_scale)

prediction = prediction.eval(feed_dict={x: normalized_images}, session=sess).astype(float)

# Ignore second prediction set, which is flipped image, a hack
prediction = list(prediction[0])
print(prediction)

# Close the API process so I don't have zombie processes
api_process.kill()