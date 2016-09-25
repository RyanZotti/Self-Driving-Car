# Self Driving (Toy) Ferrari

![img_1015](https://cloud.githubusercontent.com/assets/8901244/16572001/c224d7f4-4231-11e6-9fc7-5c39340e3daf.JPG)

![img_1045](https://cloud.githubusercontent.com/assets/8901244/16572465/dfefb2f4-4236-11e6-86a7-bee03bcedeae.JPG)

![img_1022](https://cloud.githubusercontent.com/assets/8901244/16572477/fd3dac1c-4236-11e6-86ea-93503f5cbb94.JPG)


## Project still in progress...

**Technologies:**

* Raspberry Pi
* OpenCV
* TensorFlow

Documentation coming soon ...

## Data Collection

Log into the Raspberry Pi and enter the following commands:

	# Go to wherever you installed ffmpeg
	cd /usr/src/ffmpeg
	
	# Run ffmpeg. I have no idea how this command works since I copy-and-pasted it from some website off of Google
	sudo ffserver -f /etc/ff.conf_original & ffmpeg -v quiet -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost/webcam.ffm

At this point the streaming video should be available at the URL below (although you probably won't be able to just open/view it with a web browser). Note that the IP will probably be different for you.

	http://192.168.0.35/webcam.mjpeg

## FAQ

**Q:** How do I log into the Pi?

**A:** By default the id is ***pi*** and the password is ***raspberry***. I usually ssh into mine using the "Terminal" application on my Mac. On Windows you could probably use Putty. See example command below. Note: your IP will probably be different.

	ssh pi@192.168.0.35

**Q:** How do I find the IP address for my PI?

**A:** There are probably multiple ways to do this, but whenever I connect my Raspberry Pi to a wifi network for the first time I always have to plug in my keyboard, mouse, and HDMI cable so that I can view the Pi on a monitor or TV. Then open up the Pi console and type the command below, which will print the IP to your console.

	hostname -I
