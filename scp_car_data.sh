IP=$1
SESSION=$2
# Example: sh scp_car_data.sh 192.168.1.82 152
scp pi@${IP}:/home/pi/Documents/code/Self_Driving_RC_Car/data/${SESSION}/* /Users/ryanzotti/Documents/repos/Self_Driving_RC_Car/data/${SESSION}/
echo "Finished"