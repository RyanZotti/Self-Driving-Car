## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below. Note that I do not use the normal `--network host` option but the `-p 5432:5432` option. For some reason bridge mode leads to "connection refused" errors. Also, make sure to specifcy your own location for `HOST_PGDATA`. The path specified in `HOST_PGDATA` is where your data will be stored and allows you to persist your DB even when Docker is turned off.

	# Pull the image
	docker pull postgres:11.1
		
	# Make sure the docker network exists, otherwise create it
	docker network ls
	docker network create car_network

	# Run the image
	HOST_PGDATA=/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/postgres-db
	docker run -t -d -i -p 5432:5432 \
	  --network car_network \
	  --volume HOST_PGDATA:/var/lib/postgresql/data \
	  --rm \
	  --name postgres-11-1 \
	  postgres:11.1

	# Stop the image
	docker rm -f postgres-11-1

### Database Setup

You only need to follow the steps below once.

	# Set enviornment variables
	HOST="localhost"
	DB="autonomous_vehicle"
	CREATE_TABLES="./create_tables.sql"
	
	# Create the database
	psql -U postgres -h $HOST -c "create database ${DB};"
	
	# Build the tables 
	psql -h $HOST -U postgres -d ${DB} -a -f ${CREATE_TABLES}


### Build

There is no build. I got this image from the official Postgres Docker [website](https://hub.docker.com/_/postgres).
