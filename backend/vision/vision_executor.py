from vision.camera_capture import capture_frame
from ai.vision_llm import analyze_image


async def process_vision(camera_url: str, command: dict):

    image_path = capture_frame(camera_url)

    if not image_path:

        return {
            "success": False,
            "error": "Frame capture failed"
        }

    result = await analyze_image(image_path, command)

    return {
        "success": True,
        "type": "vision_analysis",
        "intent": command.get("action"),
        "description": result
    }
