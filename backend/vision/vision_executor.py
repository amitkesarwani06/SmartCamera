import os
import uuid
from vision.camera_capture import capture_frame
from ai.vision_llm import analyze_image

# Cache directory
CACHE_DIR = "cache"

# Ensure cache folder exists
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)


async def process_vision(camera_url: str, command: dict):

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

    # Send image to VLM
    result = await analyze_image(captured_path, command)

    return {
        "success": True,
        "type": "vision_analysis",
        "intent": command.get("action"),
        "image_path": captured_path,
        "description": result
    }