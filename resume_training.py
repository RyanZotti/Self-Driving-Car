import tensorflow as tf
from Trainer import Trainer, parse_args
from util import get_prev_epoch
import os

args = parse_args()
data_path = args["datapath"]
epochs = args["epochs"]
checkpoint_dir_path = args["checkpointpath"]

start_epoch = get_prev_epoch(checkpoint_dir_path)
graph_name = 'model-'+str(start_epoch)
saver = tf.train.import_meta_graph(checkpoint_dir_path+"/"+graph_name+".meta")
sess = tf.Session()
checkpoint_file_path = os.path.join(checkpoint_dir_path,graph_name)
saver.restore(sess, checkpoint_file_path)

graph = tf.get_default_graph()

# Restore values from previous run. These values should be same for all models
accuracy = graph.get_tensor_by_name("accuracy:0")
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
                  epochs=epochs,
                  max_sample_records=1000,  # TODO: Get max_sample_records from collections file
                  start_epoch = start_epoch)

trainer.train(sess=sess, x=x, y_=y_,
              accuracy=accuracy,
              train_step=train_step,
              train_feed_dict={},
              test_feed_dict={})