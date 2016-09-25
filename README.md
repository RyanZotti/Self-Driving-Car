# Self Driving (Toy) Ferrari

![img_1015](https://cloud.githubusercontent.com/assets/8901244/16572001/c224d7f4-4231-11e6-9fc7-5c39340e3daf.JPG)

![img_1045](https://cloud.githubusercontent.com/assets/8901244/16572465/dfefb2f4-4236-11e6-86a7-bee03bcedeae.JPG)

![img_1022](https://cloud.githubusercontent.com/assets/8901244/16572477/fd3dac1c-4236-11e6-86ea-93503f5cbb94.JPG)


## Project still in progress...

**Technologies:**

* Raspberry Pi
* OpenCV
* TensorFlow

Complete documentation coming soon ...

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

Turn on video streaming from the Pi. Log into the Raspberry Pi and enter the following commands:

	# Go to wherever you installed ffmpeg
	cd /usr/src/ffmpeg
	
	# Run ffmpeg. I have no idea how this command works since I copy-and-pasted it from some website off of Google
	sudo ffserver -f /etc/ff.conf_original & ffmpeg -v quiet -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost/webcam.ffm

At this point the streaming video should be available at the URL below (although you probably won't be able to just open/view it with a web browser). Note that the IP will probably be different for you.

	http://192.168.0.35/webcam.mjpeg

Start the API webserver. Log into the Raspberry Pi in another tab. Clone this repo on the Pi and move into the folder. Then run this command.

	sudo python3 drive_api.py

On my Pi the drive API script fails if I call it with Python 2 or if I don't call it with root, but this all depends on how you set everything up and might differ based on how you did your installation.


Next run the script that displays and saves the incoming video data. Enter the command below (or you could run it from a Python IDE like PyCharm). 

	save_streaming_video_data.py

Finally, open up a web browser and point it to the URL below (IP address will likely be different for you).

	http://192.168.0.35:81/drive

Click on the page and use the arrow keys (left, right, up, down) to drive the car. The page you just clicked on has some hacky javascript I wrote that fires an API call to the webserver running on the Pi each time you hit one of the arrow keys. 

When you get to the end of your driving session, change the URL in the browser from /drive to /StoreLogEntries and hit enter. This runs an important data cleaning step on all of the commands that the webserver received during the driving session. Once the webpage says "Finished", navigate to the Terminal/Putty tab running the server, and hit control+c to kill the process. You shold now see two files. 

1. **session.txt:** contains valid and invalid accidental commands
2. **clean_session.txt:** contains only valid commands

Now kill the `save_streaming_video_data.py` script. This script should have generated two files. 

1. **video_timestamps.txt:** contains timestamps for each of the saved video frames
2. **output.mov:** contains video data

So, in total, there are four files for each driving session. I usually create a new folder for each session. Note that two of the files are on the Pi and two are on your laptop. However, all four files need to be in the same place for processing, so I usually copy the Pi files over to my laptop. You'll need to generate lots of driving data, and so copying the files from the Pi to your laptop can become tedious. I created `scp_car_data.sh` to make this easier. 

Once all of the files are in the same place, it's time to clean up all of your data and create files that TensorFlow will be able to digest for model training. All of this happens in the `dataprep.py` script. This script does a lot of things that I'll have to expand on later. 

## FAQ

**Q:** How do I log into the Pi?

**A:** By default the id is ***pi*** and the password is ***raspberry***. I usually ssh into mine using the Terminal application on my Mac. On Windows you could probably use Putty. See example command below. Note: your IP will probably be different.

	ssh pi@192.168.0.35

**Q:** How do I find the IP address for my PI?

**A:** There are probably multiple ways to do this, but whenever I connect my Raspberry Pi to a new wifi network I always have to plug in my keyboard, mouse, and HDMI cable so that I can view the Pi on a monitor or TV. Then open up the Pi console and type the command below, which will print the IP to your console.

	hostname -I
