FROM ubuntu:20.04

RUN apt-get update -y
RUN apt-get install wget vim -y
RUN wget https://repo.anaconda.com/archive/Anaconda3-2020.02-Linux-x86_64.sh
RUN bash Anaconda3-2020.02-Linux-x86_64.sh -b -p /root/anaconda3

# So that the system automatically knows to use Anaconda Python
ENV PATH=/root/anaconda3/bin:$PATH

# For access to the repo's functions
ENV PYTHONPATH=$PYTHONPATH:/root

# Copy project modules
COPY ./coordinator /root/Self-Driving-Car/coordinator
COPY ./ai /root/Self-Driving-Car/ai
COPY ./car /root/Self-Driving-Car/car
