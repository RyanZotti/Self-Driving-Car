## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below.

	# Pull the image
	docker pull ryanzotti/vehicle-engine:latest
	
	# Remove any legacy version of the containers
	docker rm -f vehicle-engine

	# Make sure the docker network exists, otherwise create it
	docker network ls
	docker network create car_network

	# Run the image
	docker run -t -d -i --privileged --network car_network -p 8092:8092 --name vehicle-engine ryanzotti/vehicle-engine:latest

	# Stop the image
	docker rm -f vehicle-engine

### Build

Over time this build will inevitably fail as dependencies are deprecated and no longer hosted. Therefore Ryan plans to build once and only once. All subsequent uses should pull from the one successful build of the image that is stored on Docker Hub. Nonetheless, if you still would like to proceed with your own build, then navigate to the directory that contains this `README.md` file and follow the steps below.

	# Build the image
	docker build -t ryanzotti/vehicle-engine:latest .
	
	# Push the image
	docker login
	docker push ryanzotti/vehicle-engine:latest


### Testing

You can also run a stub of the service.

	docker run -t -i --network car_network -p 8092:8092 --name vehicle-engine ryanzotti/vehicle-engine:latest python3 /root/tests/fake_server.py