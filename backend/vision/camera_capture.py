import cv2
import time
import os


def capture_frame(stream_url: str, save_path: str = "frame.jpg") -> str | None:
    """
    Capture a single frame from an RTSP or HTTP stream.

    Key improvements:
    - Forces TCP transport for RTSP (prevents H264 decode_slice_header errors)
    - Skips 20 frames to let decoder recover from mid-stream start
    - Validates the frame is not black before saving
    """

    # Force TCP transport for RTSP streams — prevents H264 decode errors
    # from receiving mid-GOF UDP packets
    if stream_url.startswith("rtsp://"):
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

    cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)

    if not cap.isOpened():
        print(f"[Capture] Error: Cannot open stream {stream_url}")
        return None

    # Skip more frames on RTSP (20) vs HTTP (5) to let the decoder recover
    skip = 20 if stream_url.startswith("rtsp://") else 5
    for _ in range(skip):
        cap.grab()

    ret, frame = cap.read()

    # Retry once if frame is black or failed
    if not ret or frame is None or frame.mean() < 1.0:
        print(f"[Capture] Frame was black, retrying after 1s...")
        time.sleep(1)
        for _ in range(10):
            cap.grab()
        ret, frame = cap.read()

    cap.release()

    if not ret or frame is None:
        print(f"[Capture] Error: Cannot read frame from {stream_url}")
        return None

    # Resize frame to 720p max before saving to reduce VLM input size
    h, w = frame.shape[:2]
    if max(h, w) > 720:
        scale = 720 / max(h, w)
        frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    cv2.imwrite(save_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(f"[Capture] Saved frame: {save_path} ({frame.shape[1]}x{frame.shape[0]})")
    return save_path
