import subprocess
import numpy as np


def mkdir(dir):
    shell_cmd = 'mkdir -p {dir}'.format(dir=dir)
    subprocess.check_output(shell_cmd, shell=True).strip()
    return dir


# This is used to stream video live for the self-driving sessions
# The syntax is super ugly and I don't understand how it works
# This is where I got this code from here, which comes with an explanation:
# https://stackoverflow.com/questions/21702477/how-to-parse-mjpeg-http-stream-from-ip-camera
def live_video_stream(ip, port):
    stream = urllib.request.urlopen('http://{ip}:{port}/video'.format(ip=ip, port=port))
    opencv_bytes = bytes()
    """
    When the video is streaming well, about 1 of every 15
    iterations of this loop produces an image. When the
    video is killed and there is nothing to show, the else
    part of the loop gets called consecutively indefinitely.
    I can avoid the zombie threads that take over my entire
    Tornado server (99% of CPU) if I check a consecutive
    failure count exceeding some arbitrarily high threshold
    """
    count_threshold = 50
    consecutive_no_image_count = 0
    was_available = False
    while True:
        opencv_bytes += stream.read(1024)
        a = opencv_bytes.find(b'\xff\xd8')
        b = opencv_bytes.find(b'\xff\xd9')
        if a != -1 and b != -1:
            jpg = opencv_bytes[a:b + 2]
            opencv_bytes = opencv_bytes[b + 2:]
            frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if cv2.waitKey(1) == 27:
                exit(0)
            consecutive_no_image_count = 0
            was_available = True
            yield frame
        else:
            if was_available:
                consecutive_no_image_count = 1
            else:
                consecutive_no_image_count += 1
            if consecutive_no_image_count > count_threshold:
                break
            was_available = False
