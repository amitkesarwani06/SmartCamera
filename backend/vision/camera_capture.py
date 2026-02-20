import cv2
import uuid

def capture_frame(stream_url: str):

    cap = cv2.VideoCapture(stream_url)

    ret, frame = cap.read()

    cap.release()

    if not ret:
        return None

    filename = f"frame_{uuid.uuid4().hex}.jpg"

    cv2.imwrite(filename, frame)

    return filename
