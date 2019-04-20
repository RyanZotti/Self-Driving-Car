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

RUN python3 -m pip install numpy==1.15.1 tornado==4.5.3 tensorflow==1.8.0

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

###############################################################
##### Add project files
###############################################################

ENV PYTHONPATH=$PYTHONPATH:/root

COPY ./ /root/car
