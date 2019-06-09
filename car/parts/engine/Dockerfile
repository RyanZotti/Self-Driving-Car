FROM raspbian/stretch:041518

RUN apt-get update
RUN apt-get update
RUN apt-get install -y --fix-missing unzip wget vim netcat python3-pip
RUN wget https://bootstrap.pypa.io/get-pip.py
RUN python3 get-pip.py
RUN pip install tornado==5.1.1

###############################################################
##### Add project files
###############################################################

COPY ./ /root/

CMD ffserver -f /root/ffserver.conf & bash /root/start_ffmpeg.sh & python3 /root/ffmpeg_extender.py
