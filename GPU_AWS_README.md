## AWS GPU Installation Insructions

* Select an Ubuntu 14.04 AMI, like ami-2d39803a.
* Select a GPU instance, like g2.2xlarge
* Pick a VPC and subnet
* Set "Auto-assign Public IP" to "enable"
* Select IAM role that can write to S3 (I made one called s3_write)
* Add a healthy amount of storage, like 100 GB
* Add a meaningful tag, like "Name":"ConvNet-GPU-Instance"

Run the commands below.

#
    # Do everything as root just to make things easier
	sudo su

    # Update the GPU and say 'yes' to any questions
    apt-get update && apt-get -y upgrade
    
    # Not sure what this is trying to install
    apt-get -y install linux-headers-$(uname -r) linux-image-extra-`uname -r`
    
    # Get and install CUDA
    wget http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1404/x86_64/cuda-repo-ubuntu1404_7.5-18_amd64.deb
    dpkg -i cuda-repo-ubuntu1404_7.5-18_amd64.deb
    
    # Upgrade/install again specifically for CUDA
    apt-get update -y
    apt-get install -y cuda
    
    # Get and install CUDNN
    CUDNN_FILE=cudnn-7.0-linux-x64-v4.0-prod.tgz
    wget http://developer.download.nvidia.com/compute/redist/cudnn/v4/${CUDNN_FILE}
    tar xvzf ${CUDNN_FILE}
    
    cp cuda/include/cudnn.h /usr/local/cuda/include
    cp cuda/lib64/libcudnn* /usr/local/cuda/lib64
    chmod a+r /usr/local/cuda/include/cudnn.h /usr/local/cuda/lib64/libcudnn*
    
    echo 'export CUDA_HOME=/usr/local/cuda
    export CUDA_ROOT=/usr/local/cuda
    export PATH=$PATH:$CUDA_ROOT/bin:$HOME/bin
    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUDA_ROOT/lib64:/usr/local/cuda-7.5/extras/CUPTI/lib64
    ' >> ~/.bashrc
    
    # Install Anaconda
    # Python will break if you try to put it in /root, so use /mnt/bin instead
    mkdir -p /mnt/bin
    wget http://repo.continuum.io/archive/Anaconda3-4.0.0-Linux-x86_64.sh
    bash Anaconda3-4.0.0-Linux-x86_64.sh -b -p /mnt/bin/anaconda3
    echo 'export PATH="/mnt/bin/anaconda3/bin:$PATH"' >> ~/.bashrc
    
    # Turn on bash profile to activate the PATH variables from above
    exec bash
    
    # Download and install TensorFlow binary (way easier than using source)
    export TF_BINARY_URL='https://storage.googleapis.com/tensorflow/linux/gpu/tensorflow-0.9.0rc0-cp35-cp35m-linux_x86_64.whl'
    /mnt/bin/anaconda3/bin/pip install $TF_BINARY_URL
    
    # Install git so you can clone your repo and then run your code
    apt-get install -y git    
    
    # Get data training and validation data
    wget https://s3.amazonaws.com/self-driving-car/final_processed_data_3_channels.npz
    wget https://s3.amazonaws.com/self-driving-car/training.npz
    wget https://s3.amazonaws.com/self-driving-car/validation.npz
    
    # Donwload an entire S3 folder
    aws s3 sync s3://self-driving-car /home/ubuntu
    
    # Reliable command to print GPU utilization, from Nvidia
    # Comes pre-installed on Ubuntu 14.04
    nvidia-smi
    
    # Optional command to write sysout and stderr to file
    nohup python train_3d_conv_net.py 2>&1 | tee /home/ubuntu/log.txt &
