FROM raspbian/stretch:041518

RUN apt-get update -y

# Got these steps from here: https://docs.donkeycar.com/parts/controllers/
RUN apt-get install bluetooth libbluetooth3 libusb-dev -y
RUN systemctl enable bluetooth.service

RUN apt-get install gcc vim -y

RUN wget http://www.pabr.org/sixlinux/sixpair.c
RUN gcc -o sixpair sixpair.c -lusb

# The triangula package requires python2.7
RUN apt install -y python2.7 python-pip

# Fixes error: "NameError: name 'BTN' is not defined"
# https://github.com/gvalkov/python-evdev/issues/43#issuecomment-221976730
RUN pip install evdev==0.6.0

# This is required to run the server in background. This
# specific version of pip is required to avoid an asyncio
# error. See link below for details
# https://github.com/tornadoweb/tornado/issues/2331#issuecomment-500099935
RUN pip install futures tornado==4.5.3

# This is used to interact with bluetoothctl
RUN pip install pexpect

COPY ./ /root/
