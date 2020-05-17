## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below. For Bluetooth pairing instructions, review the links [here](https://pythonhosted.org/triangula/sixaxis.html) and [here](https://pythonhosted.org/triangula/api/input.html).

	# Pull the image
	docker pull ryanzotti/ps3_controller:latest

	# Make sure the docker network exists, otherwise create it
	docker network ls
	docker network create car_network

	# Clean up any old containers
	docker rm -f ps3_controller
	
	# Run the image. The `--net=host` option is required to connect to 
	# bluetooth, see here: 
	# https://github.com/moby/moby/issues/16208#issuecomment-161770118
	# The `--privileged` is required to avoid a "No controller found 
	# on USB busses." message. All of the other volume mounts I got
	# from here: https://github.com/moby/moby/issues/16208#issuecomment-139622926
	docker run -i -t \
	  --name ps3_controller \
	  --network car_network \
	  --net=host \
	  --volume /dev/bus/usb:/dev/bus/usb \
	  --volume /run/dbus:/run/dbus \
	  --volume /var/run/dbus:/var/run/dbus \
	  --volume /dev/input:/dev/input \
	  --privileged \
	  ryanzotti/ps3_controller:latest \
	  python /root/server.py
	

### Build

You only need to follow the steps below once. Note: only Ryan has access to modify the image hosted under his DockerHub namespace, so the `push` command will fail for everyone else. The `pull` command should be allowed, however.

	# Build the laptop image
	docker build -t ryanzotti/ps3_controller:latest .
	
	# Save changes to DockerHub
	docker push ryanzotti/ps3_controller:latest

### Testing

You can also run a stub of the service.

	# TODO: Paste real steps here
