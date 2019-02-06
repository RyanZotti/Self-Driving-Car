import cv2


def detect(img):
    cascade = cv2.CascadeClassifier("/Users/ryanzotti/Documents/repos/Self-Driving-Car/haar_cascades/classifier/cascade.xml")
    rects = cascade.detectMultiScale(img, 1.3, 4, 0, (20,20))
    #print(rects)
    if len(rects) == 0:
        return [], img
    rects[:, 2:] += rects[:, :2]
    return rects, img


def make_int(number):
    if number % 2 != 0:
        number = number - 1
    return int(number)


def smallest_box(raw_squares):
    index_smallest_square = 0
    if len(raw_squares) > 1:
        # Assumes you'll only ever see one set of concentric squares, which won't
        # always be true. Would need to test for different square centers
        i = 0
        for x1, y1, x2, y2 in raw_squares:
            x1s = raw_squares[index_smallest_square][0]
            y1s = raw_squares[index_smallest_square][1]
            x2s = raw_squares[index_smallest_square][2]
            y2s = raw_squares[index_smallest_square][3]
            if x1 > x2s and y1 < y1s and x2 < x2s and y2 < y2s:
                index_smallest_square = i
    return index_smallest_square


def box(rects, img):
    index_smallest_square = smallest_box(rects)
    i = 0
    for x1, y1, x2, y2 in rects:
        y_diff = make_int(y1 - y2)
        x_average = make_int((x1 + x2) / 2)
        new_x1 = x_average - make_int((y_diff / 2))
        new_x2 = x_average + make_int((y_diff / 2))
        if i == index_smallest_square:
            # last arguement is the thickness of the bounding box
            cv2.rectangle(img, (new_x1, y1), (new_x2, y2), (127, 255, 0), 2)
        i = i + 1

def detect_stop_sign(frame):
    rects, img = detect(frame)
    box(rects, frame)
    #cv2.imshow("frame", frame)
    return frame

if __name__ == '__main__':
    cap = cv2.VideoCapture(0)
    cap.set(3,400)
    cap.set(4,300)
    while(True):
        ret, img = cap.read()
        rects, img = detect(img)
        box(rects, img)
        cv2.imshow("frame", img)
        if(cv2.waitKey(1) & 0xFF == ord('q')):
            break