## Instructions

### Pull and Run

Navigate to the directory that contains this `README.md` file, then follow the steps below.

	# Pull the image
	docker pull ryanzotti/ai:latest
	
	# Deploy a model to your laptop for predictions
	CHECKPOINT_DIRECTORY='/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data/tf_visual_data/runs/1/checkpoints'
	docker run -i -d -t \
	  -p 8885:8885 \
	  --volume $CHECKPOINT_DIRECTORY:/root/ai/model-archives/model/checkpoints \
	  --name laptop-predict \
	  ryanzotti/ai-laptop:latest \
	  python /root/ai/microservices/predict.py \
	    --port 8885 \
	    --image_scale 0.125 \
	    --angle_only 'y' \
	    --crop_factor 2 \
	    --model_id 1 \
	    --epoch 151
	
	# Stop the image
	docker rm -f laptop-predict

### Build

There are two separate images: one for the laptop and another for the Pi. Unfortunately I can't unify them into the same image because the software runs on separate architectures (x86-64 vs ARM).

	# Build the laptop image (for training or predicting)
	docker build -t ryanzotti/ai-laptop:latest . -f Dockerfile.laptop

	# Build the pi image (only for predicting)
	docker build -t ryanzotti/ai-pi:latest . -f Dockerfile.pi
