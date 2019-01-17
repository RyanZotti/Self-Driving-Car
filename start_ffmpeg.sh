#!/bin/bash

# Forcefully removing the log file avoids
# producing errors if the does not exist
rm -f home/pi/ffmpeg-logs.txt

COMMAND="ffmpeg -v verbose -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost:8090/feed1.ffm"

# In order for the check on $? to be meaningful
# you have to first run the command before
# checking $? otherwise you'll just get it
# for the `rm -f` command, which is always 0
`$COMMAND`

# Need to store return code outside of $?
# because I use the sleep command too
RETURN_CODE=$?

# Test a finite number of times in case
# something really is wrong
for i in {1..5};
  do
  if [ $RETURN_CODE -ne 0 ]
  then
      echo "Previous attempt failed starting $i"
      `$COMMAND`
  fi
  RETURN_CODE=$?
  sleep 1
done
