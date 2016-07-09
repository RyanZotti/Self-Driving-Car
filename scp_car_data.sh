SESSION=$1
scp pi@192.168.0.35:/home/pi/Documents/code/Self_Driving_RC_Car/data/${SESSION}/* /Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/${SESSION}/
echo "Finished"