FROM raspbian/stretch:041518

RUN apt-get update
RUN apt-get install -y ffmpeg python3-pip unzip

###############################################################
##### Install OpenCV
###############################################################

# All steps from here: https://github.com/Microsoft/ELL/issues/145#issuecomment-387568039

# Install pre-reqs
RUN apt-get install -y build-essential cmake pkg-config
RUN apt-get install -y libjpeg-dev libtiff5-dev libjasper-dev libpng12-dev libdc1394-22-dev
RUN apt-get install -y libavcodec-dev libavformat-dev libswscale-dev libv4l-dev
RUN apt-get install -y libxvidcore-dev libx264-dev
RUN apt-get install -y libgtk2.0-dev libgtk-3-dev
RUN apt-get install -y libatlas-base-dev gfortran
RUN apt-get install -y python3-dev

# virtualenv is necessary in Docker (and in general) because the
# OS uses Python and can mess up your pip, as seen here
# https://github.com/kennethreitz/requests/issues/3560#issuecomment-269384576
RUN pip3 install virtualenv

# Hack for getting virtualenv to work in Docker
# https://pythonspeed.com/articles/activate-virtualenv-dockerfile/
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m virtualenv --python=/usr/bin/python3 $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN virtualenv -p python3 control_loop

# Install Tensorflow 1.8 for Python3.5
RUN wget https://github.com/lhelontra/tensorflow-on-arm/releases/download/v1.8.0/tensorflow-1.8.0-cp35-none-linux_armv7l.whl
RUN pip3 install tensorflow-1.8.0-cp35-none-linux_armv7l.whl
RUN pip3 install numpy==1.15.1 tornado==4.5.3

# The `--no-cache-dir` part fixes a sha256 warning about hashes not matching
# See https://stackoverflow.com/a/40184923/554481 for details
RUN pip3 install --no-cache-dir opencv-contrib-python

# Helpful utility for figuring out which `.so` files are missing
# https://blog.piwheels.org/how-to-work-out-the-missing-dependencies-for-a-python-package/
RUN apt install apt-file -y
RUN apt-file update

# Install an ".so" file required by opencv
RUN apt install \
  libhdf5-100 \
  libilmbase12 \
  libopenexr22 \
  libgstreamer1.0-0 \
  libqtgui4 \
  libqt4-test \
  -y

# Only reason these are this high up in the Dockerfile
# is that I don't want to rebuild everything below
RUN pip3 install pandas
RUN pip3 install \
  RPi.GPIO \
  requests

# Install vi to make debugging eaiser
RUN apt-get install -y \
  vim \
  netcat

###############################################################
##### Add project files
###############################################################

ENV PYTHONPATH=$PYTHONPATH:/root

COPY ./ /root/car
