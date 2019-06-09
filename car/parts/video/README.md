## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below.

	# Pull the image
	docker pull ryanzotti/ffmpeg:latest
	
	# Remove any legacy version of the containers
	docker rm -f ffmpeg

	# Make sure the docker network exists, otherwise create it
	docker network ls
	docker network create car_network

	# Run the image
	docker run -t -d -i --device=/dev/video0 --network car_network -p 8091:8091 --name ffmpeg ryanzotti/ffmpeg:latest

	# Stop the image
	docker rm -f ffmpeg

### Build

Over time this build will inevitably fail as dependencies are deprecated and no longer hosted. Therefore Ryan plans to build once and only once. All subsequent uses should pull from the one successful build of the image that is stored on Docker Hub. Nonetheless, if you still would like to proceed with your own build, then navigate to the directory that contains this `README.md` file and follow the steps below.

	# Build the image
	docker build -t ryanzotti/ffmpeg:latest .
	
	# Push the image
	docker login
	docker push ryanzotti/ffmpeg:latest


### Testing

You can also run a stub of the service.

	docker run -t -i --network car_network -p 8091:8091 --name ffmpeg ryanzotti/ffmpeg:latest python3 /root/tests/fake_server.py

You can try streaming the video locally.

	export PYTHONPATH=$PYTHONPATH:/Users/ryanzotti/Documents/repos/Self-Driving-Car
	python tests/stream_mjpeg_video.py --ip_address localhost --port 8091