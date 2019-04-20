## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below. Note that I do not use the normal `--network host` option but the `-p 5432:5432` option. For some reason bridge mode leads to "connection refused" errors. Also, make sure to specifcy your own location for `HOST_PGDATA`. The path specified in `HOST_PGDATA` is where your data will be stored and allows you to persist your DB even when Docker is turned off.

	# Pull the image
	docker pull ryanzotti/vehicle:latest
		
	# Run the image
	docker run -t -d -i -p 8884:8884 --rm --name vehicle ryanzotti/vehicle:latest

	# Stop the image
	docker rm -f vehicle


### Build

You only need to follow the steps below once. Note: only Ryan has access to modify the image hosted under his DockerHub namespace, so the `push` command will fail for everyone else. The `pull` command should be allowed, however.

	# Build the laptop image
	docker build -t ryanzotti/vehicle:latest .
	
	# Save changes to DockerHub
	docker push ryanzotti/vehicle:latest
