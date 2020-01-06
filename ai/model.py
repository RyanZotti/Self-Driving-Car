from keras.models import Sequential
from keras.layers import Conv2D, MaxPooling2D, Lambda, Dense, Dropout, Flatten
from keras.backend.tensorflow_backend import clip


class Architecture(object):

    def __init__(self, input_shape):
        model = Sequential()
        model.add(Conv2D(32, kernel_size=(3, 3), activation='relu', input_shape=input_shape))
        model.add(Conv2D(32, (3, 3), activation='relu'))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))
        model.add(Flatten())
        model.add(Dense(128, activation='relu'))
        model.add(Dropout(0.5))
        model.add(Dense(128, activation='relu'))
        model.add(Dense(1, activation='linear'))
        model.add(Lambda(lambda x: clip(x, min_value=-1.0, max_value=1.0)))
        self.model = model

    def to_model(self):
        self.model.compile(loss='mse', optimizer='adam', metrics=['mse', 'mae'])
        return self.model
