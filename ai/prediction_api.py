import argparse
from data_augmentation import apply_transformations
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

        # TODO: Fix this bug. Right now if I don't pass mirror image, model outputs unchanging prediction
        flipped_image = cv2.flip(img_np, 1)
        normalized_images = [img_np, flipped_image]
        normalized_images = np.array(normalized_images)

        # Normalize for contrast and pixel size
        normalized_images = apply_transformations(normalized_images)

        prediction = self.prediction.eval(feed_dict={self.x: normalized_images}, session=self.sess).astype(float)

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


if __name__ == "__main__":

    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--checkpoint_dir",
        required=False,
        help="path to all of the data",
        default='/Users/ryanzotti/Documents/Data/Self-Driving-Car/printer-paper/data/tf_visual_data/runs/4/checkpoints')
    args = vars(ap.parse_args())
    path = args['checkpoint_dir']

    # Load model just once and store in memory for all future calls
    sess, x, prediction = load_model(path)

    app = make_app(sess, x, prediction)
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()