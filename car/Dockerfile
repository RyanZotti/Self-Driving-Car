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

# Download and extract OpenCV source
# The effect of the cd only lasts for the current RUN command
# so you must chain commands with && to effectively cd
# The very last line of the command points to the parent folder .. of
# the ~/opencv-3.3.0/build folder. Make sure to include the .. at the
# end of the command.
RUN cd ~ && \
    wget -O opencv.zip https://github.com/Itseez/opencv/archive/3.3.0.zip && \
    unzip opencv.zip && \
    cd opencv-3.3.0 && \
    wget -O opencv_contrib.zip https://github.com/Itseez/opencv_contrib/archive/3.3.0.zip && \
    unzip opencv_contrib.zip && \
    mkdir build && \
    cd build && cmake -D CMAKE_BUILD_TYPE=RELEASE \
        -D CMAKE_INSTALL_PREFIX=/usr/local \
        -D OPENCV_EXTRA_MODULES_PATH=../opencv_contrib-3.3.0/modules \
        -D BUILD_EXAMPLES=OFF \
        -D BUILD_TESTS=OFF \
        -D BUILD_PERF_TESTS=OFF \
        -D BUILD_opencv_python2=0 \
        -D PYTHON2_EXECUTABLE= \
        -D PYTHON2_INCLUDE_DIR= \
        -D PYTHON2_LIBRARY= \
        -D PYTHON2_NUMPY_INCLUDE_DIRS= \
        -D PYTHON2_PACKAGES_PATH= \
        -D BUILD_opencv_python3=1 \
        -D PYTHON3_EXECUTABLE=/usr/bin/python3 \
        -D PYTHON3_INCLUDE_DIR=/usr/include/python3.5 \
        -D PYTHON3_LIBRARY=/usr/lib/arm-linux-gnueabihf/libpython3.5m.so \
        -D PYTHON3_NUMPY_INCLUDE_DIRS=/usr/lib/python3/dist-packages/numpy/core/include \
        -D PYTHON3_PACKAGES_PATH=/home/pi/.local/lib/python3.5/site-packages \
        ..

RUN cd ~/opencv-3.3.0/build/ && make
RUN cd ~/opencv-3.3.0/build/ && make install

###############################################################
##### Add project files
###############################################################

ENV PYTHONPATH=$PYTHONPATH:/root

COPY ./ /root/car
