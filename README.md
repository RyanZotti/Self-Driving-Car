# Self Driving (Toy) Ferrari

![img_1015](https://cloud.githubusercontent.com/assets/8901244/16572001/c224d7f4-4231-11e6-9fc7-5c39340e3daf.JPG)

![img_1045](https://cloud.githubusercontent.com/assets/8901244/16572465/dfefb2f4-4236-11e6-86a7-bee03bcedeae.JPG)

![img_1022](https://cloud.githubusercontent.com/assets/8901244/16572477/fd3dac1c-4236-11e6-86ea-93503f5cbb94.JPG)

## Hostname Configuration

If your Pi and laptop are on the same wifi network you can test a connection to the Pi from your laptop with the command below:

```
# Run this command
ping raspberrypi.local

# And you should see results like this:
PING raspberrypi.local (192.168.1.11): 56 data bytes
64 bytes from 192.168.1.11: icmp_seq=0 ttl=64 time=12.195 ms
64 bytes from 192.168.1.11: icmp_seq=1 ttl=64 time=155.695 ms
64 bytes from 192.168.1.11: icmp_seq=2 ttl=64 time=49.939 ms
64 bytes from 192.168.1.11: icmp_seq=3 ttl=64 time=31.751 ms

# If you're able to ping the Pi, you should also be able to ssh into it
ssh pi@raspberrypi.local

```
All Raspberry Pis should respond to the raspberrypi.local hostname, but this becomes problematic if you have multiple Pis on the same wifi network (e.g., if you're using the same wifi as other autonomous Pi cars during a race at a public event). You should change the hostname to avoid these name collisions, otherwise you might not be able to find and connect to your car. On the Pi, open this file: `/etc/hosts`. Before making any edits, the file should look something like this:

```
127.0.0.1       localhost
::1             localhost ip6-localhost ip6-loopback
ff02::1         ip6-allnodes
ff02::2         ip6-allrouters

127.0.1.1       raspberrypi
```
Replace `raspberrypi` with whatever new name you want to use. In my case, I'm choosing `ryanzotti`. Next, edit the following file `/etc/hostname`. By default this file should only contain the text `raspberrypi`. Replace it with the new name, then save the file. Now commit the changes to the system and reboot:

```
# Commit the change
sudo /etc/init.d/hostname.sh

# Reboot the Pi
sudo reboot

```
You should now be able to log into your Pi like so:

```
ssh pi@ryanzotti.local
```

## Circuitry

I specialize in machine learning, not hardware, and this was my first time working with circuits. If you have prior circuitry experience and come across something I've done that doesn't make sense, go with your instinct because I could be wrong. I followed tutorials from here:

* [Raspberry Pi motor circuitry](https://business.tutsplus.com/tutorials/controlling-dc-motors-using-python-with-a-raspberry-pi--cms-20051)
* [Raspberry Pi range sensor circuitry](https://www.modmypi.com/blog/hc-sr04-ultrasonic-range-sensor-on-the-raspberry-pi)

Note that you won't be able to follow the tutorials verbatim. One of the tutorials uses a Raspberry Pi 2 whereas I use a 3. The differences are not significant, so you should be able to figure it out. Both tutorials give much better explanations than I can, but if you're curious exactly how I did the wiring, see my diagram below. 

<img width="321" alt="frame" src="https://user-images.githubusercontent.com/8901244/30244462-0e34e4be-9573-11e7-8ea8-81f1203c9492.png">

## Data Collection

<img width="321" alt="frame" src="https://cloud.githubusercontent.com/assets/8901244/18817331/d09e08ce-832b-11e6-898f-8faec3180890.png">

The TensorFlow machine learning algorithm/model needs data to learn from. The data consists of two parts.

1. **Video data:** A video is nothing more than a series of photos. I use OpenCV to represent each frame as a matrix of numbers, where each number represents a pixel. If you want black-and-white video, OpenCV will give you a 2-dimensional matrix consisting of a frame's height and width. If you decide you want color video, then OpenCV will give you a 3-dimensional matrix consisting of not just height and width but also color depth: red, green, and blue. The machine learning model will use the pixels of the matrix as predictors. 
2. **Command data:** Commands tell the motors what to do and represent the target variable. The model will try to learn which commands to send to the motor based on the video that it sees. I went for simplicity, so I defined only three types of commands: left, right, and foward. This makes driving a multinomial classification problem. The downside of having just three commands is that the instructions can be rather crude. There is no distinction between a wide and a sharp turn.

### How data collection works

This part of the project is very unintuitive and could probably be designed much better. There are multiple components.

* Raspberry Pi video streaming using a complicated Linux video utility
* A tangled mess for viewing and saving the streamed video data
* A restful API webserver that runs on the Pi and takes commands from a web browser like Google Chrome running on your laptop 
* Something for moving API command files from the Pi to your laptop where the video data is saved
* A data cleaning tool that matches your target and predictor data by timestamp and outputs a final clean numpy file that TensorFlow can ingest

### Instructions to collect data

First, you'll need to make sure that the timezone on your Raspberry Pi matches that on your laptop. The code won't be able to match the timestamps on the Pi (the driving commands) with those of the video frames on the laptop if the timezones don't match. Enter the command below into the Pi to update its timezone:

	sudo dpkg-reconfigure tzdata

Turn on video streaming from the Pi. Log into the Raspberry Pi if you haven't already and enter the following commands:

	# Go to wherever you installed ffmpeg
	cd /usr/src/ffmpeg
	
	# Run ffmpeg. I have no idea how this command works since I copy-and-pasted it from some website off of Google
	sudo ffserver -f /etc/ff.conf_original & ffmpeg -v quiet -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost/webcam.ffm

At this point the streaming video should be available at the URL below. You won't be able to view the raw video from your browser though; your browser will endlessly try to download the streaming file. Note that the IP will probably be different for you.

	http://ryanzotti.local/webcam.mjpeg

Start the API webserver. Log into the Raspberry Pi in another tab. Clone this repo on the Pi and move into the folder. Then start the server that will accept remote commands to drive the car (see the `drive_api.py` command below).

Driving speed could be a parameter that the AI learns, but for simplicity I made speed a CLI argument that is constant for the entire driving session. The car uses pulse-width modulation (PWM) to change speed, and the server's CLI accepts a speed parameter called "speed_percent" that determines the PWM setting on the Pi. A speed percent of 100 translates to max speed while 0 means the car will never move.

I'll generally use a higher speed (90-100) when collecting training data and a much lower speed (40-50) when I let the AI take over. Sometimes you'll also need to adjust speed to match the terrain. For example, my car is slow on carpet, so when the AI drives on carpet I might set a speed of 80 or even 100. The command below will start the server that accepts remote driving commands.

	sudo python3 drive_api.py --speed_percent 50

On my Pi the drive API script fails if I call it with Python 2 or if I don't call it with root, but this all depends on how you set everything up and might differ based on how you did your installation.


Next run the script that displays and saves the incoming video data. Enter the command below using the IP address of your Raspberry Pi. 

	python save_streaming_video_data.py --host ryanzotti.local

Finally, open up a web browser and point it to the URL below (IP address will likely be different for you).

	http://ryanzotti.local:81/drive

Click on the page and use the arrow keys (left, right, up, down) to drive the car. The page you just clicked on has some hacky javascript I wrote that fires an API call to the webserver running on the Pi each time you hit one of the arrow keys. 

When you get to the end of your driving session, change the URL in the browser to:

	http://ryanzotti.local:81/StoreLogEntries

Then hit enter. This runs an important data cleaning step on all of the commands that the webserver received during the driving session. Once the webpage says "Finished", navigate to the Terminal/Putty tab running the server, and hit control+c to kill the process. You shold now see two files. 

1. **session.txt:** contains valid and invalid accidental commands
2. **clean_session.txt:** contains only valid commands

Now kill the `save_streaming_video_data.py` script. This script should have generated two files. 

1. **video_timestamps.txt:** contains timestamps for each of the saved video frames
2. **output.mov:** contains video data

So, in total, there are four files for each driving session. I usually create a new folder for each session. Note that two of the files are on the Pi and two are on your laptop. However, all four files need to be in the same place for processing, so I usually copy the Pi files over to my laptop. You'll need to generate lots of driving data, and so copying the files from the Pi to your laptop can become tedious. I created `scp_car_data.sh` to make this easier. 

Once all of the files are in the same place, it's time to clean up all of your data and create files that TensorFlow will be able to digest for model training. All of this happens in the `save_all_runs_as_numpy_files.py` script. This script assigns a label (left, right, straight) to each image and performs basic data cleaning. It saves each driving session separately as a .npz file.

## Data Capture Quickstart

In short, to gather training data you should have three terminal sessions open:

```
# Terminal 1
ssh pi@ryanzotti.local
cd /usr/src/ffmpeg
sudo ffserver -f /etc/ff.conf_original & ffmpeg -v quiet -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost/webcam.ffm

# Terminal 2
ssh pi@ryanzotti.local
cd /home/pi/Documents/code/Self-Driving-Car
sudo su
python3 drive_api.py --speed_percent 100

# Terminal 3
cd /Users/ryanzotti/Documents/repos/Self-Driving-Car
python save_streaming_video_data.py --host ryanzotti.local
```

## Data Backup

I highly recommend backing up your data somewhere like AWS's S3. See command-line examples below. 

Note that without the `--delete` flag, the `aws synch` command won't delete data from S3 but will add it if it doesn't exist. This is helpful so that you don't accidentally obliterate your entire backup. 

The `sync` command is recursive, so it can copy files within nested folders. You can find the official AWS docs on this command [here](http://docs.aws.amazon.com/cli/latest/userguide/using-s3-commands.html).

	# Specify your own locations
	LOCAL_FOLDER='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
	S3_FOLDER='s3://self-driving-car/data'
	
	# To back up to AWS
	aws s3 sync ${LOCAL_FOLDER} ${S3_FOLDER}
	
	# To restore backup from AWS
	aws s3 sync ${S3_FOLDER} ${LOCAL_FOLDER}
	
	# You can also delete unwanted files from the AWS backup
	aws s3 sync ${LOCAL_FOLDER} ${S3_FOLDER} --delete
	
The command above can take an extremely long time depending on your internet connection speed. At one point I had basic a cheap AT&T internet plan with only 250 kbps upload speed (advertised at 5 Mbps), and it took me 5-8 hours to upload about an hour's worth of driving data. 

**EDIT:** I've since ditched AT&T's 5 Mbps $40/month package and replaced it with San Francisco's Google Fiber (via Webpass) package at $42/month for 1,000 Mbps (1 Gbps). Actual upload speed ranges between 400-900 Mbps. Now uploading 4-5 hours of driving data takes just 1-2 minutes. Google Fiber is amazing. I love it.
	
To run all of these AWS commands locally, you need to tell AWS that you have access. AWS does this with the `aws_secret_access_key` and `aws_access_key_id`. When you spin up an AWS instance (e.g., a GPU), you can assign an AWS `IAM Role` to the instance and the instance will inherit these credentials. However, AWS can't assign an IAM Role to your laptop, so you'll need to update `~/.aws/credentials` so that it looks something like the contents below. These are obviously fake values, but the real values look just as much like long gibberish strings. You can get the actual values associated with your account through the AWS IAM console. You should never expose your real values to the public -- thieves could take control of your entire AWS account and, for example, run up a massive bill, among other things.

	[default]
	aws_access_key_id = ASDFSDFSDFSDFSDFKKJSDFEUSXN
	aws_secret_access_key = SKJE8ss3jsefa3sjKSDWdease3kjsdvna21
	region = us-east-1
	
The video data takes up a lot of space on your local machine. I periodically check how much storage I have used by running the following command.

	DATA_DIR='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
	du -sh ${DATA_DIR}

## Data Processing

At the start of my project I relied on `dataprep.py` to aggregate all of my sessions' image and label data into a single file for model training. As my dataset grew, my 16 GB memory laptop started having memory issues when processing all of the files simultaneously. My limit seemed to be 44,000 240x320x3 images.

Since I don't want to spend money on a GPU Apache Spark cluster, I decided to sample my data using the `Dataset.py` script and `Dataset` class. `Dataset` assumes that you have already run the `save_all_runs_as_numpy_files.py` script. The `Dataset` class has to be instantiated in each model training script, since it now takes care of creating batches as well.

## Model Training

Training on the GPU is so much faster than training on the CPU that I now ***only*** train on the GPU except when debugging. I get about a 14x speedup when running on one of AWS's Tesla K80 GPUs (p2.xlarge) compared to my Mac's CPU. Mac's don't have a Tensorflow-supported built-in GPU, so I rely on AWS to do my GPU training. Check out [this link](https://github.com/RyanZotti/Self-Driving-Car/blob/master/AWS_P_Series_GPU_Setup.md ) for details on GPU training (how to build your own AWS GPU AMI, etc). As of now, Amazon Web Services, Google Compute Engine, and Microsoft Azure all provide the same Nvidia K80 GPU. AWS charges $0.90 per hour, and Google charges $0.70 per hour. Microsoft doesn't make it easy to compare to AWS, so I have no idea what they charge. Ultimately I plan to try all three services and go with the cheapest.

I've written scripts for training many different types of models. To avoid confusion I've standardized the command-line interface inputs across all scripts by leveraging the same `Trainer` class in `Trainer.py`. All scripts automatically sync/archive data with AWS's S3. This means that the model will always train on the latest batch of training data. It also means that you need to be prepared to download ***ALL*** of the training data, which as of now is about 50 GB. Make sure your laptop or GPU has enough space before attempting. 

Each script syncs with S3 before training so that it's possible to train multiple models in parallel without the backups overwriting each other. The `Trainer` class writes backups to S3 after each epoch. 

Training a new model is simple. See the example below. The `nohup` and `&` tell the model to train in the background so that you can close your computer (assuming your code is running in the cloud and not locally).

	S3_BUCKET=self-driving-car # Specify your own S3 bucket
	SCRIPT=train_conv_net.py
	# Optionally, in development mode, avoid syncing to save money on S3 data transfers
	S3_SYNC=n
	
	# All scripts follow the same command-line interface
	nohup python3 ${SCRIPT} --datapath /root/data \
		--epochs 100 \
		--s3_bucket ${S3_BUCKET} \
		--s3_sync ${S3_SYNC} &

Training still takes a long time (e.g., 10+ hours) even when training on a GPU. To make recovery from unexpected failures easier, I use Tensorflow's checkpoint feature to be able to start and stop my models. These are included in the model backups sent to the cloud. Tensorflow model checkpointing also makes it possible to rely on AWS Spot Instances, which I haven't tried yet. 

I created a script called `resume_training.py` that is agnostic to the model whose training is being restarted. It reads in a Tensorflow checkpoint file that you specify and reonconstructs the model in memory before it resumes training. You can call it like this:

	# Your paths will differ
	DATA_PATH='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data'
	EPOCHS=100
	MODEL_DIR='/Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/tf_visual_data/runs/1'
	S3_BUCKET=self-driving-car
	# Optionally, in development mode, avoid syncing to save money on S3 data transfers
	S3_SYNC=n
	
	# Run the script
	python resume_training.py \
	        --datapath $DATA_PATH \
	        --epochs $EPOCHS \
	        --model_dir $MODEL_DIR \
	        --s3_bucket ${S3_BUCKET} \
	        --s3_sync ${S3_SYNC}
	        
	# Or on a GPU
	DATA_PATH='/root/data'
	EPOCHS=100
	MODEL_DIR='/root/data/tf_visual_data/runs/4'
	S3_BUCKET=self-driving-car

	# Run the script
	nohup python3 resume_training.py \
        	--datapath $DATA_PATH \
        	--epochs $EPOCHS \
        	--model_dir $MODEL_DIR \
        	--s3_bucket ${S3_BUCKET} \
        	--show_speed True &


## FAQ

**Q:** How do I log into the Pi?

**A:** By default the id is ***pi*** and the password is ***raspberry***. I usually ssh into mine using the Terminal application on my Mac. On Windows you could probably use Putty. See example command below. Note: your IP will probably be different.

	ssh pi@raspberrypi.local

**Q:** How do I find the IP address for my PI?

**A:** There are probably multiple ways to do this, but whenever I connect my Raspberry Pi to a new wifi network I always have to plug in my keyboard, mouse, and HDMI cable so that I can view the Pi on a monitor or TV. Then open up the Pi console and type the command below, which will print the IP to your console. If you've already assigned a hostname to your Pi (e.g., replaced raspberrypi.local with something else), then you effectively don't need to use the IP address.

	hostname -I


## Useful Links

* [TensorFlow Timeslines example](https://stackoverflow.com/documentation/tensorflow/3850/measure-the-execution-time-of-individual-operations#t=201707090002297903596 ): Show execution time for each node in your TensorFlow graph
* [Raspberry Pi motor circuitry](https://business.tutsplus.com/tutorials/controlling-dc-motors-using-python-with-a-raspberry-pi--cms-20051): Tutorial for connecting DC motors to your Raspberry Pi
* [Raspberry Pi range sensor circuitry](https://www.modmypi.com/blog/hc-sr04-ultrasonic-range-sensor-on-the-raspberry-pi): Tutorial for connecting an ultrasonic range sensor to your Pi
* [https://www.howtogeek.com/167195/how-to-change-your-raspberry-pi-or-other-linux-devices-hostname/](https://www.howtogeek.com/167195/how-to-change-your-raspberry-pi-or-other-linux-devices-hostname/): Tutorial to give your Pi a hostname so that it's easier to find on wifi
* [http://docs.donkeycar.com/](http://docs.donkeycar.com/) Docs for DonkeyCar, a DIY Meetup group in San Francisco. 
* [http://docs.donkeycar.com/](https://github.com/otaviogood/carputer): The GitHub repo for the winner of the DIYRobors meetup in San Francisco and Oakland
* [https://makezine.com/projects/build-autonomous-rc-car-raspberry-pi/](https://makezine.com/projects/build-autonomous-rc-car-raspberry-pi/) Donkeycar overview

