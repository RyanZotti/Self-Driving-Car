import argparse
import asyncio
from concurrent.futures import ThreadPoolExecutor
import os
from threading import Thread
from tensorflow.keras.callbacks import Callback, ModelCheckpoint
import tornado.ioloop
import tornado.web

from ai.data_generator import DataGenerator
from ai.model import Architecture
from ai.record_reader import RecordReader
from ai.utilities import load_keras_model, execute_sql, get_sql_rows


class Trainer:

    # TODO: Add class docs describing each of these args and why they're needed
    def __init__(
        self, data_path, postgres_host, port, model_base_directory, model_id= None,
        total_epochs=50, batch_size=50, image_scale=8, crop_percent=50, overfit=False,
        angle_only=True, n_channels=3
    ):

        """
        Create a Trainer object

        Parameters
        ----------
        data_path : str
            The absolute path to the directory immediately above the
            dataset folders. If you have datasets like /root/data/dataset_1_18-04-15
            and /root/data/dataset_1_18-04-15, then your base_directory
            should be /root/data
        postgres_host: str
            Name of the Postgres host to connect to for details about records
            and other things. If record_reader.py is running in a Docker container
            the host would be the name of the container, e.g., postgres-11-1 but
            if record_reader.py is running in PyCharm on the Mac, then you would
            use localhost.
        port: int
            The port of the Tornado microservice that is used to report to the UI
            the current epoch, batch, loss, and model ID
        model_base_directory: str
            The directory that contains all of the models. For example, if you
            have two models: /root/model/1 and /root/model/2, then you should
            specify /root/model. For simplicity the code assumes all your models
            are organized under the one base directory. Nothing about where the
            model is stored is saved in the DB because the model_base_directory
            is something you will use frequently such that you'll probably know
            it from either repetition or already-working examples of your code
        model_id: int
            Specify this value if you want to continue training an existing model.
            The code will expect to find an immediate child directory to
            model_base_directory that matches the model ID and will fail if such a
            directory doesn't exist because you can't resume training a model that
            doesn't exist. The code will automatically pick a model ID for you if
            you don't specify one and assumes you are training a new model
        total_epochs: int
            The model is not trained for a number of iterations given by epochs,
            but merely until the epoch id before total_epochs is reached. For
            retraining, this means nothing will happen if you specify total_epochs=5
            but your model has already trained for 10; it won't train for 5 more.
            For new models this makes no difference because epoch_id starts at 0
        batch_size : int
            The number of records per batch
        image_scale: int
            Essentially divide an image by this number to get the new size.
            For example if you specify 8 the image will shrink to 1/8th of its
            original size. If you specify 1 then the image won't shrink at all
        crop_percent: int
            The percentage of the top portion of the image that should be taken
            off. Through trial an error this has proven to be an effective
            technique. Other drivers have come to the same conclusion. Nothing
            of importance happens in the top half the image. The top half only
            contains distractions. The model performs better if it has zero
            chance of fitting to that source of randomness
            Example: 50, to cut off the top half
        overfit : boolean
            Indicates whether the model should be trained and validated
            on the same data. I use this when I'm training on images
            that the model got horribly wrong (or recorded disengagements
            that occurred during a recorded deployment)
        angle_only : boolean
            Whether to focus on angle only. Possibly focuses model's
            attention on the most egregious errors, turning right when
            the car should turn left, etc
        is_for_model : boolean
            Will this be used to feed data to a model, as opposed to an
            API? The API doesn't care about train / validation selections,
            but the model does and pulls the selections from Postgres
        n_channels: int
            The number of color channels in your image dataset. Should be
            3 if color (RGB) and 1 if black and white. Used to define the
            shape of the Keras model input
        """

        self.data_path = data_path
        self.postgres_host = postgres_host
        self.batch_size = batch_size
        self.overfit = overfit
        self.angle_only = angle_only
        self.record_reader = RecordReader(
            base_directory=self.data_path,
            postgres_host=self.postgres_host,
            batch_size=self.batch_size,
            overfit=self.overfit,
            angle_only=self.angle_only,
            is_for_model=True
        )
        self.port = port
        self.model_base_directory = model_base_directory
        self.model_id = model_id
        self.n_epochs = int(total_epochs)
        self.image_scale = int(image_scale)
        self.crop_percent = crop_percent
        self.image_height_pixels = int((240 * (self.crop_percent / 100.0)) / self.image_scale)
        self.image_width_pixels = int(320 / self.image_scale)
        self.n_channels = n_channels
        self.input_shape = (self.image_height_pixels, self.image_width_pixels, self.n_channels)

        self.train_generator = DataGenerator(
            record_reader=self.record_reader,
            partition_type='train',
            image_scale=int(self.image_scale),
            crop_percent=self.crop_percent,
            batch_size=self.batch_size
        )

        self.validation_generator = DataGenerator(
            record_reader=self.record_reader,
            partition_type='validation',
            image_scale=int(self.image_scale),
            crop_percent=self.crop_percent,
            batch_size=self.batch_size
        )

        """
        If you specify all of the batches then it will take a very long
        time to evaluate (in some cases 5+ minutes per epoch) because
        the model will have to process every single image in the
        validation set. Assuming your random sample is representative
        of the entire dataset, picking some arbitrarily small number of
        steps (batches) should give you a sufficiently accurate
        representation of the error
        """
        self.validation_steps = 3

        """
        If you specify a model ID the code assumes you're retraining. Don't specify a
        model ID if you want to train a new model. The system doesn't trust that users
        can safely come up with their own versions because you'll need to check both
        the file system and Postgres
        """
        if self.model_id:  # Existing model
            self.model_directory = os.path.join(self.model_base_directory, str(self.model_id))

            # Check for a common user error and provide a helpful error message
            if not os.path.exists(self.model_directory):
                print(
                    "The model doesn't exist at {dir}.".format(dir=self.model_directory),
                    "Did you specify the right path and model ID?",
                    "Also, don't specify the model ID if you want to train a new model.",
                    "The system will automatically determine a new model's model ID."
                )
                exit(1)

            self.start_epoch = self.get_starting_epoch()

            # Load the model
            saved_model_path = os.path.join(self.model_directory, 'model.hdf5')
            self.model = load_keras_model(file_path=saved_model_path)


        else:  # New model
            """
            Model IDs are tracked in two places: in Postgres and in the file
            system. It's possible these two places could get out of sync with
            each other because of an unforeseen bug, so to be extra safe when
            creating a new model's ID I take the largest ID from the two
            sources and increment it
            """
            # Get the highest model ID from the file system
            folders = os.listdir(self.model_base_directory)
            model_ids = []
            for folder in folders:
                """
                Each model's folder should be its ID, and each ID should be
                an int. Ignore the folder if it's not an int
                """
                try:
                    model_id = int(folder)
                    model_ids.append(model_id)
                except:
                    pass
            highest_folder_id = max(model_ids)

            # Get the highest model ID from Postgres
            sql = """
                SELECT
                    COALESCE(
                        MAX(model_id),
                    0) AS model_id
                FROM models
            """
            highest_db_id = int(get_sql_rows(host=self.postgres_host, sql=sql)[0]['model_id'])

            # The new model ID is highest known model ID + 1
            highest_model_id = max(highest_folder_id, highest_db_id)
            self.model_id = highest_model_id + 1

            # Track the model in the file system
            self.model_directory = os.path.join(self.model_base_directory, str(self.model_id))
            os.makedirs(self.model_directory)

            # Track the model in the database
            models_sql = '''
                INSERT INTO models(
                    model_id,
                    created_timestamp,
                    crop,
                    scale
                ) VALUES (
                    {model_id},
                    NOW(),
                    {crop},
                    {scale}
                )
                '''.format(
                    model_id=self.model_id,
                    crop=self.crop_percent,
                    scale=self.image_scale
                )
            execute_sql(
                host=self.postgres_host,
                sql=models_sql
            )

            # Create the model
            architecture = Architecture(input_shape=self.input_shape)
            self.model = architecture.to_model()

            self.start_epoch = 0

        # The Keras way of tracking the current batch ID in a training epoch
        # TODO: Get epoch ID from directory if model is retraining
        checkpoint_path = os.path.join(self.model_directory, 'model.hdf5')
        self.checkpoint_callback = ModelCheckpoint(
            filepath=checkpoint_path,
            verbose=1,
            save_best_only=True
        )
        self.progress_callback = ProgressCallBack(
            model_id=self.model_id,
            postgres_host=postgres_host,
            epoch_id=self.start_epoch
        )

        self.microservice_thread = Thread(target=self.start_microservice,kwargs={'port':self.port})
        self.microservice_thread.daemon = True
        self.microservice_thread.start()

    # The asyncio library is required to start Tornado as a separate thread
    # https://github.com/tornadoweb/tornado/issues/2308
    def start_microservice(self, port):
        asyncio.set_event_loop(asyncio.new_event_loop())
        self.microservice = tornado.web.Application([(r'/training-state', TrainingState)])
        self.microservice.listen(port)
        self.microservice.model_id = self.model_id
        self.microservice.batch_count = self.record_reader.get_batches_per_epoch()
        self.microservice.batch_id = -1
        self.microservice.epoch_id = self.start_epoch
        tornado.ioloop.IOLoop.current().start()

    # This function is agnostic to the model
    def train(self):
        self.model.fit_generator(
            self.train_generator,
            initial_epoch=self.start_epoch,
            steps_per_epoch=len(self.train_generator),
            epochs=self.n_epochs,
            validation_data=self.validation_generator,
            validation_steps=self.validation_steps,
            callbacks=[self.progress_callback, self.checkpoint_callback]
        )

    def get_starting_epoch(self):

        """
        Looks up the most recently completed epoch ID for the model
        and adds one to it. Previously I would track epoch ID in the
        checkpoint file path, but this made it harder to prune old
        checkpoint files and required some extra custom code that I
        felt wasn't worth it. Also, I realized that I can't recall a
        time where I wanted to go back to an old model. If the latest
        model was worse I always preferred to make it better by
        training it on all of the data again rather than loading the
        older model. I think I had this preference because I felt
        that if I couldn't get back an approximation of the old model
        with the same data, then what the model unlearned had been
        learned by random chance in the first place and wasn't worth
        trying to replicate or wasn't stable enough to last through
        additional training.

        This function should only get called during retraining, i.e.,
        when a model already exists, since you'll always have a
        starting_epoch of 0 for new models.

        Returns
        -------
        starting_epoch: int
        """

        # Get the highest model ID from Postgres
        sql = """
            SELECT
                MAX(epoch) AS previous_epoch
            FROM epochs
            WHERE
                model_id = {model_id}
            GROUP BY model_id
        """.format(
            model_id=self.model_id
        )
        rows = get_sql_rows(host=self.postgres_host, sql=sql)
        if len(rows) > 0:
            previous_epoch = int(rows[0]['previous_epoch'])
            starting_epoch = previous_epoch + 1
            return starting_epoch
        else:
            return 0


# TODO: Replace with click package
def parse_boolean_cli_args(args_value):
    parsed_value = None
    if isinstance(args_value, bool):
        parsed_value = args_value
    elif args_value.lower() in ['y', 'true']:
        parsed_value = True
    else:
        parsed_value = False
    return parsed_value


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("-d", "--data-path", required=False,
                    help="path to all of the data",
                    default='/root/ai/data')
    ap.add_argument(
        "--postgres-host",
        required=False,
        help="Postgres host for record_reader.py"
    )
    ap.add_argument(
        "--model-base-directory",
        required=True,
        help="The full path to the folder containing all model IDs"
    )
    ap.add_argument("-e", "--epochs", required=False,
                    help="quantity of batch iterations to run",
                    default='500')
    ap.add_argument(
        "--port",
        required=False,
        help="Docker port"
    )
    ap.add_argument(
        "--model_id",
        required=False,
        help="The model you would like to retrain"
    )
    ap.add_argument("--overfit", required=False,
                    help="Use same data for train and test (y/n)?",
                    default=False)
    ap.add_argument("--crop_percent", required=False,
                    help="Chop top crop_percent off of image",
                    default=50)
    ap.add_argument("--angle_only", required=False,
                    help="Use angle only model (Y/N)?",
                    default='Y')
    ap.add_argument(
        "--image_scale",
        required=False,
        help="How much to grow or shrink the image. Example: 0.0625 shrinks to 1/16 of original size",
        default=1.0)
    ap.add_argument(
        "--batch_size", required=False,
        help="Images per batch",
        default=32)
    args = vars(ap.parse_args())
    args['image_scale'] = float(args['image_scale'])
    args['port'] = int(args['port'])
    args['crop_percent'] = float(args['crop_percent'])
    args['overfit'] = parse_boolean_cli_args(args['overfit'])
    args['angle_only'] = parse_boolean_cli_args(args['angle_only'])
    return args

class TrainingState(tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(5)

    @tornado.concurrent.run_on_executor
    def get_metadata(self):
        result = {
            'model_id' : self.application.model_id,
            'batch_count' : self.application.batch_count,
            'batch_id' : self.application.batch_id,
            'epoch_id': self.application.epoch_id
        }
        return result

    @tornado.gen.coroutine
    def post(self):
        result = yield self.get_metadata()
        self.write(result)

class ProgressCallBack(Callback):

    """
    In the very early version of Tensorflow you would have to pass a feed_dict
    value for each batch, which created a natural breaking point in the code
    to update state, which could be used for reporting things like the current
    batch, epoch, accuracy, and how many batches remained in the epoch (so that
    you know if you should wait a few more seconds because the epoch is almost
    done). The Keras approach is to use Callbacks, which is why this class exists

    Got the documentation from here: https://www.tensorflow.org/guide/keras/custom_callback
    """

    def __init__(self, model_id, postgres_host, epoch_id):
        self.batch_id = -1
        self.epoch_id = epoch_id
        self.model_id = model_id
        self.postgres_host = postgres_host
        super().__init__()

    def on_epoch_end(self, epoch, logs=None):
        """
        Called at the end of every epoch. Used to track progress so that it
        can be exposed via the microservice REST API

        Parameters
        ----------
        epoch : int
            The ID of the epoch. Starts at 0.
        logs: dict
            Contains loss metrics about the epoch. Looks like this: {
                'val_loss': 0.07307642698287964,
                'val_mse': 0.07091525197029114,
                'val_mae': 0.18278947472572327,
                'loss': 0.10936613730630096,
                'mse': 0.10936612,
                'mae': 0.22850043
            }
        """

        self.epoch_id = epoch
        train_mean_absolute_error = logs['mae']
        validation_mean_absolute_error = logs['val_mae']
        sql_query = '''
                INSERT INTO epochs(model_id, epoch, train, validation)
                VALUES ({model_id},{epoch},{train},{validation});
            '''.format(
            model_id=self.model_id,
            epoch=self.epoch_id,
            train=train_mean_absolute_error,
            validation=validation_mean_absolute_error
        )
        execute_sql(
            host=self.postgres_host,
            sql=sql_query
        )

    def on_train_batch_end(self, batch, logs=None):
        """
        Called at the end of every batch. Used to track progress so that it
        can be exposed via the microservice REST API

        Parameters
        ----------
        batch : int
            The ID of the batch. Starts at 0.
        logs: dict
            Contains loss metrics about the training batch. Looks like this: {
                'batch': 48,
                'size': 50,
                'loss': 0.12477378,
                'mse': 0.11125242,
                'mae': 0.22997361
            }
        """

        self.batch_id = batch
