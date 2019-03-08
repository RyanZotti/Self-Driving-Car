import tensorflow as tf
from ai.Trainer import Trainer, parse_args, format_s3_bucket
from ai.utilities import get_prev_epoch, file_is_stored_locally, sync_from_aws
import os


args = parse_args()
data_path = args["datapath"]
epochs = args["epochs"]
model_dir = args["model_dir"]
show_speed = args['show_speed']
s3_bucket = format_s3_bucket(args['s3_bucket'])
s3_sync = args['s3_sync']
save_to_disk = args['save_to_disk']
batch_size = int(args['batch_size'])
overfit = args['overfit']
image_scale = args['image_scale']
crop_percent = args['crop_percent']
angle_only = args['angle_only']

checkpoint_dir_path = os.path.join(model_dir,'checkpoints')

# Sync with S3 if model or data (or both) are not available locally
if not file_is_stored_locally(checkpoint_dir_path) and s3_sync:
    sync_from_aws(s3_path=s3_bucket, local_path=data_path)

start_epoch = get_prev_epoch(checkpoint_dir_path)
graph_name = 'model-'+str(start_epoch)
checkpoint_file_path = os.path.join(checkpoint_dir_path,graph_name)
saver = tf.train.import_meta_graph(checkpoint_dir_path+"/"+graph_name+".meta")
sess = tf.Session()

# Read the model into memory
saver.restore(sess, checkpoint_file_path)
graph = tf.get_default_graph()

# Restore values from previous run. These values should be same for all models
optimization = graph.get_tensor_by_name("loss:0")
x = graph.get_tensor_by_name("x:0")
y_ = graph.get_tensor_by_name("y_:0")
train_step = graph.get_operation_by_name('train_step')

train_feed_dict = {}
test_feed_dict = {}

dropout_keep_prob = None
try:
    dropout_keep_prob = graph.get_tensor_by_name("dropout_keep_prob:0")
    train_feed_dict[dropout_keep_prob] = 0.5  # TODO: Get dropout_keep_prob from collections file
except:
    test_feed_dict[dropout_keep_prob] = 1.0

trainer = Trainer(data_path=data_path,
                  model_file=None,
                  s3_bucket=s3_bucket,
                  epochs=epochs,
                  max_sample_records=100,  # TODO: Get max_sample_records from collections file
                  start_epoch = start_epoch,
                  is_restored_model=True,
                  restored_model_dir=model_dir,
                  show_speed=show_speed,
                  s3_sync=s3_sync,
                  save_to_disk=save_to_disk,
                  batch_size=batch_size,
                  overfit=overfit,
                  image_scale=image_scale,
                  crop_percent=crop_percent,
                  angle_only=angle_only)

trainer.train(sess=sess, x=x, y_=y_,
              optimization=optimization,
              train_step=train_step,
              train_feed_dict={},
              test_feed_dict={})