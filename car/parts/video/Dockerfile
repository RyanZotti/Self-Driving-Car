FROM raspbian/stretch:041518

# Got all instructions from here:
# https://www.pyimagesearch.com/2018/09/19/pip-install-opencv/

RUN apt-get update
RUN apt-get install -y ffmpeg python3-pip unzip wget vim netcat
RUN apt-get install -y \
  libhdf5-dev \
  libhdf5-serial-dev \
  libqtwebkit4 \
  libqt4-test \
  libatlas-base-dev \
  libjasper-dev \
  libqtgui4 \
  libilmbase-dev \
  libopenexr-dev \
  libgstreamer1.0-dev
RUN wget https://bootstrap.pypa.io/get-pip.py
RUN python3 get-pip.py
RUN pip install opencv-contrib-python tornado==5.1.1 numpy==1.15.1

COPY ./ /root/

CMD ffserver -f /root/ffserver.conf & bash /root/start_ffmpeg.sh & python3 /root/server.py