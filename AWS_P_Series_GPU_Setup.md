## Instructions

See details below.

	# I got most of my steps from this website
	# https://alliseesolutions.wordpress.com/2016/09/08/install-gpu-tensorflow-from-sources-w-ubuntu-16-04-and-cuda-8-0-rc/
	
	# Run everything as root
	sudo su
	
	# I have no clue why I have to do the commands immediately below
	add-apt-repository ppa:graphics-drivers/ppa
	echo "deb [arch=amd64] http://storage.googleapis.com/bazel-apt stable jdk1.8" | sudo tee /etc/apt/sources.list.d/bazel.list
	curl https://storage.googleapis.com/bazel-apt/doc/apt-key.pub.gpg | apt-key add -
	
	apt-get update
	apt-get install -y pkg-config zip g++ zlib1g-dev unzip
	
	add-apt-repository ppa:webupd8team/java
	apt-get update
	apt-get install -y oracle-java8-installer
	apt-get install -y bazel
	apt-get upgrade -y bazel

	# Download CUDA 8.0, which is 1.4 GB and takes a super long time to download
	wget https://developer.nvidia.com/compute/cuda/8.0/prod/local_installers/cuda_8.0.44_linux-run
	# Install NVIDIA Accelerated Graphics Driver for Linux-x86_64 367.48? n
	# Install the CUDA 8.0 Toolkit?: y
	# Enter Toolkit Location: /usr/local/cuda-8.0
	# Do you want to install a symbolic link at /usr/local/cuda?: y
	# Install the CUDA 8.0 Samples?: y
	# Enter CUDA Samples Location: /home/ubuntu
	sh cuda_8.0.44_linux.run --override # hold s to skip or hit crtl-c
		
	wget https://developer.nvidia.com/compute/cuda/8.0/prod/local_installers/cuda-repo-ubuntu1604-8-0-local_8.0.44-1_amd64-deb
	
	# You'll have to manually download this and then scp it up because of a 403. I think it's because Nvidia wants you to go through their website for marketing
	wget https://developer.nvidia.com/compute/machine-learning/cudnn/secure/v5.1/prod/8.0/cudnn-8.0-linux-x64-v5.1-tgz
	tar -xzvf cudnn-8.0-linux-x64-v5.1.tgz
	
	mkdir -p /usr/local/cuda/lib64/
	cp cuda/include/cudnn.h /usr/local/cuda/include
	cp cuda/lib64/libcudnn* /usr/local/cuda/lib64
	chmod a+r /usr/local/cuda/include/cudnn.h /usr/local/cuda/lib64/libcudnn*
	
	vi ~/.bashrc
	export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/local/cuda/lib64:/usr/local/cuda/extras/CUPTI/lib64"
	export CUDA_HOME=/usr/loca/cuda
	
	cd ~
	wget http://repo.continuum.io/archive/Anaconda3-4.0.0-Linux-x86_64.sh
	bash Anaconda3-4.0.0-Linux-x86_64.sh -b
	
	echo "export PATH=/root/anaconda3/bin/:$PATH" >> ~/.bashrc
	source ~/.bashrc
	
	git clone https://github.com/tensorflow/tensorflow
	cd ~/tensorflow
	# Default location of python: /root/anaconda3/bin//python
	# Do you wish to build TensorFlow with Google Cloud Platform support?: N
	# Do you wish to build TensorFlow with Hadoop File System support? : N
	# Please input the desired Python library path to use. : /root/anaconda3/lib/python3.5/site-packages
	# Do you wish to build TensorFlow with OpenCL support? : N
	# Do you wish to build TensorFlow with CUDA support? : y
	# Please specify which gcc should be used by nvcc as the host compiler. : /usr/bin/gcc
	# Please specify the CUDA SDK version you want to use, e.g. 7.0 : 8.0
	# Please specify the location where CUDA 8.0 toolkit is installed. : /usr/local/cuda
	# Please specify the Cudnn version you want to use. : 5.1.5
	# Please specify the location where cuDNN 5.1.5 library is installed : /usr/local/cuda
	# Please note that each additional compute capability significantly increases your build time and binary size. : 3.5,5.2
	./configure
	
	apt-get install python3-pip
	
	# Fix for "/usr/bin/env: 'python': No such file or directory" bug
	# https://github.com/tensorflow/tensorflow/issues/2801
	# Change the first line (i.e., the shebang) of the weird file below to: #!/root/anaconda3/bin/python
	#/root/.cache/bazel/_bazel_root/efb88f6336d9c4a18216fb94287b8d97/execroot/tensorflow/third_party/gpus/crosstool/clang/bin/crosstool_wrapper_driver_is_not_gcc
	
	bazel build -c opt --config=cuda //tensorflow/tools/pip_package:build_pip_package

	bazel-bin/tensorflow/tools/pip_package/build_pip_package  /tmp/tensorflow_pkg
	# Hit tab for autocompletion
	pip3 install /tmp/tensorflow_pkg/tensorflow
	# tab-completion might show this: pip3 install /tmp/tensorflow_pkg/tensorflow-0.11.0-cp35-cp35m-linux_x86_64.whl
	
	export PYTHONPATH=/usr/local/lib/python3.5/dist-packages:$PYTHONPATH
	export PYTHONPATH=/usr/local/lib/python3.5/dist-packages/tensorflow
	
	# If you're using Anaconda 3.5, you need to delete the python 3.4 numpy or you'll get a multiarray error
	rm -rf /usr/local/lib/python3.4/dist-packages/numpy
	
	# Start up python and try to import to see if everything worked
	import tensorflow as tf
	

If you're starting from the AMI ('tensorflow-0.11.0 p2.xlarge', ami-e4f4cbf3), some of the settings disappear, and you'll hvae to run the commands below instead of the commands above.

	sudo su
	cd /root/tensorflow/
	# This bazel command might take a minute or two
	bazel-bin/tensorflow/tools/pip_package/build_pip_package  /tmp/tensorflow_pkg
	
	# Hit tab for autocompletion
	pip3 install /tmp/tensorflow_pkg/tensorflow
	# tab-completion might show this: pip3 install /tmp/tensorflow_pkg/tensorflow-0.11.0-cp35-cp35m-linux_x86_64.whl
	
	cd
	echo "export PATH=/root/anaconda3/bin/:$PATH" >> ~/.bashrc
	source ~/.bashrc
	
	cd
	cp -R tensorflow /usr/lib/python3/dist-packages/

	# Start up python and try to import to see if everything worked
	import tensorflow as tf

	
	
