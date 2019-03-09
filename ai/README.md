## Instructions



### Train a Model

Navigate to the directory that contains this `README.md` file, then follow the steps below.

	# Pull the image
	docker pull ryanzotti/ai:latest

	# Make sure the docker network exists, else create it
	docker network ls
	docker network create app_network

	# Train a new model
	DATA_DIRECTORY='/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data'
	docker run -i -t -p 8091:8091 \
	  --network app_network \
	  --volume $DATA_DIRECTORY:/root/ai/data \
	  --name model-training \
	  ryanzotti/ai-laptop:latest \
	  python /root/ai/microservices/tiny_cropped_angle_model.py \
	    --image_scale 8 \
	    --angle_only y \
	    --crop_percent 50 \
	    --show_speed n \
	    --s3_sync n \
	    --save_to_disk y

	# Resume training an existing model
	DATA_DIRECTORY='/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data'
	MODEL_ID='5'
	docker run -i -t -p 8091:8091 \
	  --network app_network \
	  --volume $DATA_DIRECTORY:/root/ai/data \
	  --name resume-training \
	  ryanzotti/ai-laptop:latest \
	  python /root/ai/microservices/resume_training.py \
	    --model_dir /root/ai/data/tf_visual_data/runs/${MODEL_ID} \
	    --datapath /root/ai/data \
	    --image_scale 8 \
	    --angle_only y \
	    --crop_percent 50 \
	    --show_speed n \
	    --s3_sync n \
	    --save_to_disk y

	# Stop the image
	docker rm -f model-training
	
### Deploy a Model for Predicting

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
	    --image_scale 8 \
	    --angle_only 'y' \
	    --crop_percent 50 \
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
