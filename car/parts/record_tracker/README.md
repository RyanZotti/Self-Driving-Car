## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below.

	# Pull the image
	docker pull ryanzotti/record-tracker:latest
	
	# Remove any legacy version of the containers
	docker rm -f record-tracker

	# Make sure the docker network exists, otherwise create it
	docker network ls
	docker network create car_network

	# Run the image
	docker run -t -d -i \
		--network car_network \
		-p 8093:8093 \
		--name record-tracker \
		--volume /home/pi/datasets:/datasets
		ryanzotti/record-tracker:latest

	# Stop the image
	docker rm -f record-tracker

### Build

Over time this build will inevitably fail as dependencies are deprecated and no longer hosted. Therefore Ryan plans to build once and only once. All subsequent uses should pull from the one successful build of the image that is stored on Docker Hub. Nonetheless, if you still would like to proceed with your own build, then navigate to the directory that contains this `README.md` file and follow the steps below.

	# Build the image
	docker build -t ryanzotti/record-tracker:latest .
	
	# Push the image
	docker login
	docker push ryanzotti/record-tracker:latest


### Testing

You can also run a stub of the service. Note that unlike other servers, the record tracker server does not have a separate python file for testing. The logic for writing to a filesystem is the same in test and in production. 

	# Make sure a dataset directory exists
	mkdir -p ./datasets
	
	# Run the service
	DATASETS_DIR=${PWD}/datasets
	docker run -t -i \
		--network car_network \
		-p 8093:8093 \
		--name record-tracker \
		--volume ${DATASETS_DIR}:/datasets \
		ryanzotti/record-tracker:latest \
		python3 /root/server.py