import cv2
import numpy as np
import os
import time

class EVSManager:
    """
    Efficient Video Sampling (EVS) Manager.
    Reduces VLM tokens/compute by only triggering analysis when a 
    'Temporally Dynamic Patch' (significant change) is detected.
    """
    def __init__(self, threshold=15.0, min_interval=5.0):
        self.last_frames = {}  # camera_id -> grayscale_frame
        self.last_analysis_time = {} # camera_id -> timestamp
        self.threshold = threshold # % pixel change threshold
        self.min_interval = min_interval # Seconds between mandatory scans

    def should_analyze(self, camera_id: str, current_frame_path: str) -> bool:
        """
        Determines if a frame represents a significant enough change to warrant VLM reasoning.
        """
        now = time.time()
        
        # Periodic check even if no motion (to ensure system is live)
        if now - self.last_analysis_time.get(camera_id, 0) > 60: # Max 1 min without analysis
            self.last_analysis_time[camera_id] = now
            return True

        if not os.path.exists(current_frame_path):
            return False

        try:
            # Load and preprocess
            frame = cv2.imread(current_frame_path)
            if frame is None: return False
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            if camera_id not in self.last_frames:
                self.last_frames[camera_id] = gray
                self.last_analysis_time[camera_id] = now
                return True

            # Calculate Absolute Difference
            frame_delta = cv2.absdiff(self.last_frames[camera_id], gray)
            thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
            
            # Calculate % of pixels changed
            change_ratio = (np.count_nonzero(thresh) / thresh.size) * 100
            
            # Update state
            self.last_frames[camera_id] = gray

            if change_ratio > self.threshold:
                # Rate limit VLM to avoid spamming (e.g. min 5s between analysis)
                if now - self.last_analysis_time.get(camera_id, 0) >= self.min_interval:
                    print(f"[EVS] Significant change ({change_ratio:.2f}%) detected on {camera_id}. Triggering VLM.")
                    self.last_analysis_time[camera_id] = now
                    return True
            
            return False

        except Exception as e:
            print(f"[EVS] Error analyzing frame: {e}")
            return True # Default to True on error to be safe

evs_manager = EVSManager()
