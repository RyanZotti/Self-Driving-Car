FROM raspbian/stretch:041518

RUN apt-get update
RUN apt-get install -y ffmpeg

COPY ./ /root/

CMD ffserver -f /root/ffserver.conf & bash /root/start_ffmpeg.sh