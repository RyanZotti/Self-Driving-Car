## Instructions

### Build Generic Server Base Image

Each of the parts has a server image that depends on the generic server image.

	# Build the laptop image
	docker build \
		-t ryanzotti/generic_server:latest \
		-f Dockerfile.generic_server .

	# Save changes to DockerHub
	docker push ryanzotti/generic_server:latest


### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below. Note that I do not use the normal `--network host` option but the `-p 5432:5432` option. For some reason bridge mode leads to "connection refused" errors. Also, make sure to specifcy your own location for `HOST_PGDATA`. The path specified in `HOST_PGDATA` is where your data will be stored and allows you to persist your DB even when Docker is turned off.

	# Pull the image
	docker pull ryanzotti/control_loop:latest

	# Make sure the docker network exists, otherwise create it
	docker network ls
	docker network create car_network

	# TODO: Automate these steps
	docker run -t -d -i --device=/dev/video0 --network host --name ffmpeg ryanzotti/ffmpeg:latest

	# Delete any old containers
	docker rm -f control-loop

	# Run the image
	docker run -i -t -p 8887:8887 \
	  --name control-loop \
	  --network car_network \
	  ryanzotti/control_loop:latest \
	  python3 /root/car/start.py

	# Interactively running the container also requires the network
	docker run -it --network car_network  ryanzotti/control_loop:latest /bin/bash

	# Stop the image
	docker rm -f control-loop


### Build and Push

Ensure that the base image is available (this is a note for Ryan). Many of the part servers build on top of this base image.

	docker build -t ryanzotti/control_loop:latest .
	docker push ryanzotti/control_loop:latest
