## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below.

	# Pull the image
	docker pull ryanzotti/vehicle-memory:latest
	
	# Remove any legacy version of the containers
	docker rm -f vehicle-memory

	# Make sure the docker network exists, otherwise create it
	docker network ls
	docker network create car_network

	# Run the image
	docker run -t -d -i --network car_network -p 8095:8095 --name vehicle-memory ryanzotti/vehicle-memory:latest

	# Stop the image
	docker rm -f vehicle-memory

### Build

Over time this build will inevitably fail as dependencies are deprecated and no longer hosted. Therefore Ryan plans to build once and only once. All subsequent uses should pull from the one successful build of the image that is stored on Docker Hub. Nonetheless, if you still would like to proceed with your own build, then navigate to the directory that contains this `README.md` file and follow the steps below.

	# Build the image
	docker build -t ryanzotti/vehicle-memory:latest .
	
	# Push the image
	docker login
	docker push ryanzotti/vehicle-memory:latest


### Testing

There is no need to run a stub of the service. You can run the real thing. It will simply expose the fake inputs from the test.