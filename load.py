import tensorflow as tf
from Dataset import Dataset
from data_augmentation import process_data

dir = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/tf_visual_data/runs/21/checkpoints'
graph_name = 'model-0'  # I'll need to find a way to automatically figure out the epoch name
saver = tf.train.import_meta_graph(dir+"/"+graph_name+".meta")

sess = tf.Session()

saver.restore(sess, dir+"/"+graph_name)

train_feed_dict = {}
test_feed_dict = {}

data_path = '/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
max_sample_records = 1000
dataset = Dataset(input_file_path=data_path, max_sample_records=max_sample_records)
merged = tf.summary.merge_all()

train_images, train_labels = process_data(dataset.get_sample(train=True))

# Not sure what these two lines do
run_opts = tf.RunOptions(trace_level=tf.RunOptions.FULL_TRACE)
run_opts_metadata = tf.RunMetadata()

graph = tf.get_default_graph()
accuracy = graph.get_tensor_by_name("accuracy:0")
x = graph.get_tensor_by_name("x:0")
y_ = graph.get_tensor_by_name("y_:0")
train_step = graph.get_operation_by_name('train_step')


train_feed_dict[x] = train_images
train_feed_dict[y_] = train_labels

tf.summary.scalar('accuracy', accuracy)
merged = tf.summary.merge_all()


train_summary, train_accuracy = sess.run([merged, accuracy], feed_dict=train_feed_dict)
test_images, test_labels = process_data(dataset.get_sample(train=False))
test_feed_dict[x] = test_images
test_feed_dict[y_] = test_labels
test_summary, test_accuracy = sess.run([merged, accuracy], feed_dict=test_feed_dict)
message = "epoch: {0}, training accuracy: {1}, validation accuracy: {2}"
print(message.format(-1, train_accuracy, test_accuracy))

sess.run(train_step,feed_dict=train_feed_dict)
print('Finished')

