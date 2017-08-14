## Instructions

See details below.

	# I got most of my steps from this website
	# https://alliseesolutions.wordpress.com/2016/09/08/install-gpu-tensorflow-from-sources-w-ubuntu-16-04-and-cuda-8-0-rc/
	
	# Run everything as root
	sudo su
	
	# Install A 8.0
	wget http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1604/x86_64/cuda-repo-ubuntu1604_8.0.44-1_amd64.deb
	dpkg -i cuda-repo-ubuntu1604_8.0.44-1_amd64.deb
	apt-get update
	apt-get install -y cuda

	# You'll have to manually download this and then scp it up because of a 403. I think it's because Nvidia wants you to go through their website for marketing
	# wget https://developer.nvidia.com/compute/machine-learning/cudnn/secure/v5.1/prod/8.0/cudnn-8.0-linux-x64-v5.1-tgz
	# Fortunately I'm now hosting the file in my own S3 bucket
	wget https://s3.amazonaws.com/self-driving-car/cudnn-8.0-linux-x64-v5.1.tgz
	tar -xzvf cudnn-8.0-linux-x64-v5.1.tgz
	mkdir -p /usr/local/cuda/lib64/
	cp cuda/include/cudnn.h /usr/local/cuda/include
	cp cuda/lib64/libcudnn* /usr/local/cuda/lib64
	chmod a+r /usr/local/cuda/include/cudnn.h /usr/local/cuda/lib64/libcudnn*
	
	echo 'export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/local/cuda/lib64:/usr/local/cuda/extras/CUPTI/lib64"' >> /root/.bashrc
	echo 'export CUDA_HOME=/usr/local/cuda' >> /root/.bashrc
	
	source /root/.bashrc
	
	# Install Anaconda python
	wget http://repo.continuum.io/archive/Anaconda3-4.0.0-Linux-x86_64.sh
	bash Anaconda3-4.0.0-Linux-x86_64.sh -b
	echo 'export PATH="/root/bin/anaconda3/bin:$PATH"' >> /root/.bashrc
	
	apt-get install -y python3-pip awscli
		
	# Inform pip3 you want to uninstall tensorflow if an older version exists
	pip3 uninstall tensorflow
	
	# Delete all the tensorflow files that pip3 couldn't find
	find / 2>/dev/null | grep tensorflow | xargs rm -rf
	
	# Magically install tensorflow -- no more awful building from source
	pip3 install tensorflow-gpu opencv-python boto3

		
	
If you want to see the GPU utilization, open another session on the GPU and type:

	watch -n 0.5 nvidia-smi
	
	# If above fails with "Failed to initialize NVML: Driver/library version mismatch" then try: 
	sudo reboot
	
How to run the training code:

	# If starting up a new EC2 instance
	# Latest AMI: tensorflow-1.1.0 p2.xlarge v1 (ami-4d38625b)
	
	# Make sure you're in root and not in the Tensorflow install folder
	sudo su	
	cd /root
		
	# Download training data
	aws s3 cp s3://self-driving-car/data /root/data --recursive

	# Delete the old cloned repo
	rm -rf /root/Self-Driving-Car
	
	# Clone the new repo
	git clone https://github.com/RyanZotti/Self-Driving-Car
	cd Self-Driving-Car/
	
	# Runable scripts: train_conv_net.py, train_deep_convnet.py, train_ANN.py, train_mlp.py, train_shallow_convnet.py, etc
	SCRIPT=train_conv_net.py
	nohup python3 ${SCRIPT} --datapath /root/data \
		--epochs 100 \
		--s3_bucket self-driving-car \
		--show_speed True &