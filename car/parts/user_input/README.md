## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below. Note that I do not use the normal `--network host` option but the `-p 5432:5432` option. For some reason bridge mode leads to "connection refused" errors. Also, make sure to specifcy your own location for `HOST_PGDATA`. The path specified in `HOST_PGDATA` is where your data will be stored and allows you to persist your DB even when Docker is turned off.

	# Pull the image
	docker pull ryanzotti/user_input:latest

	# Make sure the docker network exists, otherwise create it
	docker network ls
	docker network create car_network

	# Run the image
	docker run -i -t -p 8884:8884 \
	  --name user_input \
	  --network car_network \
	  --privileged \
	  -d \
	  ryanzotti/user_input:latest \
	  python3 /root/server.py --port 8884

	# Stop the image
	docker rm -f user_input


### Build

You only need to follow the steps below once. Note: only Ryan has access to modify the image hosted under his DockerHub namespace, so the `push` command will fail for everyone else. The `pull` command should be allowed, however.

	# Build the laptop image
	docker build -t ryanzotti/user_input:latest .
	
	# Save changes to DockerHub
	docker push ryanzotti/user_input:latest

### Testing

You can also run a stub of the service.

	docker run -t -i --network car_network -p 8884:8884 --name user_input ryanzotti/user_input:latest python3 /root/tests/fake_server.py
