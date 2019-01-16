rm -f home/pi/ffmpeg-logs.txt
COMMAND="ffmpeg -v verbose -r 5 -s 320x240 -f video4linux2 -i /dev/video0 http://localhost:8090/feed1.ffm"
`$COMMAND`
while [ $? -ne 0 ];
  do `$COMMAND`;
done