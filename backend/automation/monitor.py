import os
import glob
import uuid
import asyncio
import httpx
from vision.camera_capture import capture_frame
from vision.dashboard_capture import get_latest_dashboard_snapshot
from ai.vision_llm import analyze_industrial_safety
from settings import get_max_screenshots, get_alert_keywords, is_webhook_enabled, get_webhook_url

from database import SessionLocal
from models import Camera, Alert

CACHE_FOLDER = "cache"

# Ensure cache folder exists
if not os.path.exists(CACHE_FOLDER):
    os.makedirs(CACHE_FOLDER)

async def run_monitoring():
    print("[Automation] Starting monitoring cycle...")
    
    db = SessionLocal()
    try:
        cameras = db.query(Camera).all()
        if not cameras:
            print("[Automation] No cameras found in database.")
            return

        for camera in cameras:
            if not camera.streamUrl:
                continue

            print(f"[Automation] Processing camera: {camera.name} ({camera.id})")
            
            # Generate unique filename for this screenshot
            filename = f"{camera.id}_{uuid.uuid4().hex}.jpg"
            image_path = os.path.join(CACHE_FOLDER, filename)

            # --- Primary: Capture frame from RTSP stream ---
            captured_path = capture_frame(camera.streamUrl, save_path=image_path)

            # --- Fallback: Use latest dashboard snapshot if RTSP failed ---
            if not captured_path:
                print(f"[Automation] RTSP capture failed for {camera.name} — checking for dashboard snapshot...")
                captured_path = get_latest_dashboard_snapshot(str(camera.id))
                if captured_path:
                    print(f"[Automation] Using dashboard snapshot for VLM: {captured_path}")
                else:
                    print(f"[Automation] No snapshot available for {camera.name}, skipping.")
                    continue

            # Analyze for alerts using industrial-specific VLM
            result = await analyze_industrial_safety(captured_path)
            print(f"[Automation] VLM Result for {camera.name}: {result}")

            # Skip alert processing for invalid/garbage VLM output
            if "SKIPPED" in result.upper():
                continue

            # Check for alert triggers using dynamic keywords
            keywords = get_alert_keywords()
            if "ALERT DETECTED" in result.upper() or any(k.lower() in result.lower() for k in keywords):
                await handle_alert(db, camera, result, captured_path)
            
    finally:
        db.close()

    cleanup_cache()

async def handle_alert(db, camera, message, image_path):
    """
    Persists the alert and triggers notifications.
    """
    print(f"\n!!! ALERT DETECTED on {camera.name} !!!")
    print(f"Details: {message}\n")

    # 1. Persist to Database
    new_alert = Alert(
        cameraId=camera.id,
        cameraName=camera.name,
        message=message,
        severity="critical" if "fire" in message.lower() or "smoke" in message.lower() else "warning",
        imagePath=image_path
    )
    db.add(new_alert)
    db.commit()

    # 2. Webhook Notification (dynamic settings)
    if is_webhook_enabled() and get_webhook_url():
        await send_webhook(camera.name, message)

async def send_webhook(camera_name, message):
    """
    Sends a generic webhook notification.
    """
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "content": f"🚨 **Security Alert** 🚨\n**Camera:** {camera_name}\n**Details:** {message}"
            }
            response = await client.post(get_webhook_url(), json=payload)
            if response.status_code >= 400:
                print(f"[Webhook] Error: {response.status_code}")
    except Exception as e:
        print(f"[Webhook] Failed to send: {e}")

def cleanup_cache():
    """
    Maintains only the last MAX_SCREENSHOTS across the entire cache.
    Reads the limit dynamically from settings.
    """
    max_screenshots = get_max_screenshots()
    files = sorted(
        glob.glob(os.path.join(CACHE_FOLDER, "*.jpg")),
        key=os.path.getmtime
    )

    if len(files) > max_screenshots:
        for f in files[:-max_screenshots]:
            try:
                os.remove(f)
            except Exception as e:
                print(f"[Cleanup] Error removing {f}: {e}")


def get_cached_screenshots() -> list:
    """
    Returns metadata for all cached screenshots (for the /automation/screenshots API).
    Sorted newest-first.
    """
    files = sorted(
        glob.glob(os.path.join(CACHE_FOLDER, "*.jpg")),
        key=os.path.getmtime,
        reverse=True
    )
    result = []
    for f in files:
        stat = os.stat(f)
        # Extract camera_id from filename pattern: {camera_id}_{uuid}.jpg
        basename = os.path.basename(f)
        parts = basename.rsplit("_", 1)
        camera_id = parts[0] if len(parts) == 2 else "unknown"
        result.append({
            "filename": basename,
            "path": f.replace("\\", "/"),
            "camera_id": camera_id,
            "size_kb": round(stat.st_size / 1024, 1),
            "modified": stat.st_mtime,
        })
    return result
