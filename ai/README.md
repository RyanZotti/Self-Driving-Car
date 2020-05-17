## Instructions

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

	# Push the laptop image to Docker Hub
	docker push ryanzotti/ai-laptop:latest

	# Build the pi image (only for predicting)
	docker build -t ryanzotti/ai-pi-python3-7-buster:latest . -f Dockerfile.pi-buster-python3-7

	# Push the Pi image to Docker Hub
	docker push ryanzotti/ai-pi-python3-7-buster:latest

	# Pull the image down onto the pi
	docker pull ryanzotti/ai-pi-python3-7-buster:latest

To test than an image will work on the Pi (that it can import a model and key dependnecies), run the code below.

```
# Test that you can perform an import (runs an emulated ARM VM on your Mac
docker rm -f test; docker run -it --name test --volume /Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/model:/root/model ryanzotti/ai-pi-python3-7-buster:latest  bash
```

Then type `python` and paste in the following:

```
from ai.utilities import load_keras_model

model_id = 23
path = '/root/model'
file_path = path+'/'+str(model_id)+'/model.hdf5'
model = load_keras_model(file_path)

```
If you don't get any errors then the image works.

## Archived Builds

These builds worked, so I want to keep a record of them (other than   in just the git commit history), so I'm keeping them in the `archived-dockerfiles` folder and describing their significance below.

Dockerfile: `Dockerfile.pi`

Docker Hub: `ryanzotti/ai-pi:latest`

Features: 

* Python 3.5
* Tensorflow 1.8
* OpenCV 3 (installed quickly with pip)

I originally chose 1.8 because I think it was it oldest version of Tensorflow that supported prediction clipping. I use prediction clipping so that the model doesn't get penalized when its predictions fall outside the -1.0 to 1.0 range. This made a pretty big impact on the loss rate. Eventually I got fed up with Tensorflow and moved to Keras on my laptop. When I tried to import a trained Keras model on the Pi with 1.8, however, I got an error about how the `load_model` function from Keras wasn't recognized. I really value the simplicity of Keras' ability to load `.hdf5` models, so I decided to upgrade to the next Tensorflow version that supported it, and so this image is no longer relevant. 

```

# Build the image
docker build -t ryanzotti/ai-pi:latest . -f archived-dockerfiles/Dockerfile.pi

# Run the image. Requires mounting the model volume to test
# the import
docker run -it --volume /Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/model:/root/model ryanzotti/ai-pi:latest bash
```

Dockerfile: `Dockerfile.pi-37-other`

Docker Hub: `yanzotti/ai-pi-python3-7-buster-other:latest`

Features: 

* Python 3.7
* Tensorflow 2.0

In March 2020 I wasted over 10+ recorded hours trying to get **any** recent version of Tensorflow working on the Pi. It seems that Pi support is no longer a priority for Google, which is a shame. Google mentions the Pi in the official documentation, but the Raspberry Pi wheels that Google provided all had errors like `Semgnetation Fault (Core Dumped)` errors when I tried to import my models, so I think Google built the images incorrectly and probably didn't have sufficient automated testing to catch the issue. Google also listed documentation about how to build the Pi images yourself in Docker containers, but those failed too. So I've completely lost trust for Google's ability to maintain software.

While I lost a lot of respect for Google, I gained a lot respect for whomever maintains this site: https://github.com/lhelontra/tensorflow-on-arm/releases

This person has a lot of wheels, and over a multi-year span continues to produce new wheels. Assuming this continues
indefinitely, I might want to come back to this example (though
with a different Tensorflow version and maybe a different) version of Python. I've had lots of trouble getting Tensorflow's own wheels to work, so this site is valuable.

```
# Build the image
docker build -t ryanzotti/ai-pi-python3-7-buster-other:latest . -f Dockerfile.pi-37-other

# Run the image. Requires mounting the model directory so that
# you can import a model
docker run -it --volume /Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/model:/root/model ryanzotti/ai-pi-python3-7-buster-other:latest bash
```