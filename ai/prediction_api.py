from  data_augmentation import apply_transformations
import tensorflow as tf
import tornado.ioloop
import tornado.web
from util import *


class PredictionHandler(tornado.web.RequestHandler):

    @property
    def prediction(self):
        return self._prediction

    @prediction.setter
    def prediction(self,prediction):
        self._prediction = prediction

    def initialize(self, sess, x, prediction):
        self.prediction = prediction
        self.sess = sess
        self.x = x

    @property
    def sess(self):
        return self._sess

    @sess.setter
    def sess(self, sess):
        self._sess = sess

    @property
    def x(self):
        return self._x

    @x.setter
    def x(self, x):
        self._x = x

    def post(self):

        # I don't quite understand how this works. "image" is what
        # I called the key of the dict in the request json but
        # I think "body" is a built-in Tornado thing in the
        # tornado.HTTPFile class. Anyways, it works.
        file_body = self.request.files['image'][0]['body']

        # Ugly code to convert string to image
        # https://stackoverflow.com/questions/17170752/python-opencv-load-image-from-byte-string/17170855
        nparr = np.fromstring(file_body, np.uint8)
        img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        cv2.imwrite('/Users/ryanzotti/Documents/repos/Self-Driving-Car/regular.jpg', img_np)
        #print(img_np[0])

        # This produces result consistent w/ Trainer.py code
        hardcoded_image = cv2.imread('/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_1_18-04-15/45_cam-image_array_.jpg', 1)
        flipped_image = cv2.flip(hardcoded_image, 1)
        normalized_images = [hardcoded_image, flipped_image]
        normalized_images = np.array(normalized_images)
        normalized_images = apply_transformations(normalized_images)
        prediction = self.prediction.eval(feed_dict={self.x: normalized_images}, session=self.sess).astype(float)
        print('From disk with no transformation')
        print(list(prediction[0]))

        # Meant to mimic what API does to image
        hardcoded_image = cv2.imread(
            '/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/dataset_1_18-04-15/45_cam-image_array_.jpg',
            1)
        hardcoded_image = cv2.imencode('.jpg', hardcoded_image)[1].tostring()
        nparr = np.fromstring(hardcoded_image, np.uint8)
        img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        flipped_image = cv2.flip(img_np, 1)
        normalized_images = [img_np, flipped_image]
        normalized_images = np.array(normalized_images)
        normalized_images = apply_transformations(normalized_images)
        prediction = self.prediction.eval(feed_dict={self.x: normalized_images}, session=self.sess).astype(float)
        print('From disk but with string to bytes to string conversion')
        print(list(prediction[0]))

        nparr = np.fromstring(file_body, np.uint8)
        img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        flipped_image = cv2.flip(img_np, 1)
        normalized_images = [img_np, flipped_image]
        normalized_images = np.array(normalized_images)
        normalized_images = apply_transformations(normalized_images)
        prediction = self.prediction.eval(feed_dict={self.x: normalized_images}, session=self.sess).astype(float)
        print('From API')
        print(list(prediction[0]))

        # print(normalized_images[0])
        # TODO: Fix this bug. Right now if I don't pass mirror image, model outputs unchanging prediction
        #flipped_image = cv2.flip(img_np, 1)
        #normalized_images = [img_np, flipped_image]
        #normalized_images = np.array(normalized_images)

        #cv2.imwrite('/Users/ryanzotti/Documents/repos/Self-Driving-Car/test.jpg', normalized_images[0])

        # Normalize for contrast and pixel size
        ##normalized_images = apply_transformations(normalized_images)
        #print(normalized_images[0])
        #prediction = self.prediction.eval(feed_dict={self.x: normalized_images}, session=self.sess).astype(float)
        #print(prediction)
        # Ignore second prediction set, which is flipped image, a hack
        prediction = list(prediction[0])

        result = {'prediction': prediction}
        self.write(result)


def make_app(sess, x, prediction):
    return tornado.web.Application(
        [(r"/predict",PredictionHandler,
          {'sess':sess,
           'x':x,
           'prediction':prediction})])


def load_model(checkpoint_dir_path):

    # Read the model into memory
    sess = tf.Session()
    start_epoch = get_prev_epoch(checkpoint_dir_path)
    graph_name = 'model-' + str(start_epoch)
    checkpoint_file_path = os.path.join(checkpoint_dir_path, graph_name)
    saver = tf.train.import_meta_graph(checkpoint_dir_path + "/" + graph_name + ".meta")
    saver.restore(sess, checkpoint_file_path)
    graph = tf.get_default_graph()
    x = graph.get_tensor_by_name("x:0")
    # For more details on why .outputs[0] is required, see:
    # https://stackoverflow.com/questions/42595543/tensorflow-eval-restored-graph
    make_logits = graph.get_operation_by_name("logits")
    prediction = make_logits.outputs[0]

    return sess, x, prediction


if __name__ == "__main__":
    # Load model just once and store in memory for all future calls
    # TODO: remove this hard coded path
    path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/tf_visual_data/runs/2/checkpoints'
    sess, x, prediction = load_model(path)

    app = make_app(sess, x, prediction)
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()