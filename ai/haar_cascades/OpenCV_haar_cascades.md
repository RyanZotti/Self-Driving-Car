## Instructions

First off, the OpenCV Haar Cascades training feature is awful. There has to be a better way. Anyways, here are steps.

	python negative_images.py
	cd /Users/ryanzotti/Documents/repos/opencv-haar-classifier-training
	find ./positive_images -iname "*.jpg" > positives.txt
	find ./negative_images -iname "*.jpg" > negatives.txt
	perl bin/createsamples.pl positives.txt negatives.txt samples 1500 "opencv_createsamples -bgcolor 0 -bgthresh 0 -maxxangle 1.1 -maxyangle 1.1 maxzangle 0.5 -maxidev 40 -w 80 -h 40"
	conda create --name python2 python=2
	source activate python2
	opencv_traincascade -data classifier -vec samples.vec -bg negatives.txt -numStages 20 -minHitRate 0.999 -maxFalseAlarmRate 0.5 -numPos 1000 -numNeg 600 -w 80 -h 40 -mode ALL -precalcValBufSize 1024 -precalcIdxBufSize 1024

## References

* http://coding-robin.de/2013/07/22/train-your-own-opencv-haar-classifier.html
* https://github.com/mrnugget/opencv-haar-classifier-training
* http://www.trevorsherrard.com/Haar_training.html
* http://docs.opencv.org/3.1.0/dc/d88/tutorial_traincascade.html
* http://www.pyimagesearch.com/2016/06/20/detecting-cats-in-images-with-opencv/
* http://note.sonots.com/SciSoftware/haartraining.html