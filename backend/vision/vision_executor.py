import os
import uuid
from vision.camera_capture import capture_frame
from vision.evs_logic import evs_manager
from ai.vision_llm import analyze_image, analyze_smart_security

# Cache directory
CACHE_DIR = "cache"

# Ensure cache folder exists
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)


async def process_vision(camera_url: str, command: dict):
    camera_id = command.get("camera_id", "manual")
    action = command.get("action", "analyze")
    
    # Generate unique filename
    filename = f"frame_{uuid.uuid4().hex}.jpg"
    image_path = os.path.join(CACHE_DIR, filename)

    # Capture frame and save into cache folder
    captured_path = capture_frame(camera_url, save_path=image_path)

    if not captured_path:
        return {
            "success": False,
            "error": "Frame capture failed"
        }

    # Apply EVS (Efficient Video Sampling)
    # If it's a manual command, we always analyze. 
    # If it's a periodic check, we use EVS.
    is_manual = command.get("manual", True)
    if not is_manual and not evs_manager.should_analyze(camera_id, captured_path):
        return {
            "success": True,
            "type": "evs_skip",
            "message": "No significant change detected. VLM analysis skipped."
        }

    # Send image to VLM
    if action == "smart_security":
        result = await analyze_smart_security(captured_path)
    else:
        result = await analyze_image(captured_path, command)

    return {
        "success": True,
        "type": "vision_analysis",
        "intent": action,
        "image_path": captured_path,
        "description": result
    }