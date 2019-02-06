## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below.

	# Pull the image
	docker pull ryanzotti/ai:latest
	
	# Train a model
	docker run -t --network host ryanzotti/ai:latest \
	  python /root/ai/microservices/tiny_cropped_angle_model.py \
        --datapath /root/data \
        --epochs 100 \
        --show_speed 'N' \
        --save_to_disk 'N' \
        --image_scale 0.125 \
        --s3_bucket self-driving-car \
        --crop_factor 2
	
	# Stop the image
	docker rm -f ffmpeg

### Build

Over time this build will inevitably fail as dependencies are deprecated and no longer hosted. Therefore Ryan plans to build once and only once. All subsequent uses should pull from the one successful build of the image that is stored on Docker Hub. Nonetheless, if you still would like to proceed with your own build, then navigate to the directory that contains this `README.md` file and follow the steps below.

	# Build the image
	docker build -t ryanzotti/ai:latest . -f Dockerfile.laptop
	
	# Run the image
	docker run -t -i --device=/dev/video0 --network host ryanzotti/ffmpeg:latest
