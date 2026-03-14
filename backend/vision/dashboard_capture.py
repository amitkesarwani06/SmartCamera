import os
import base64
import glob
import uuid


CACHE_FOLDER = "cache"


def save_dashboard_snapshot(camera_id: str, image_base64: str) -> str:
    """
    Decodes a base64-encoded JPEG from the frontend (captured from a <video> element)
    and saves it to the cache folder as the latest dashboard snapshot for the given camera.

    Naming convention: cache/dashboard_{camera_id}.jpg
    (always overwrites — only the most recent snapshot is kept per camera)
    """
    os.makedirs(CACHE_FOLDER, exist_ok=True)

    # Strip data-URL prefix if present (e.g. "data:image/jpeg;base64,...")
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_base64)

    save_path = os.path.join(CACHE_FOLDER, f"dashboard_{camera_id}.jpg")
    with open(save_path, "wb") as f:
        f.write(image_bytes)

    print(f"[Dashboard Snapshot] Saved for camera {camera_id} → {save_path}")
    return save_path


def get_latest_dashboard_snapshot(camera_id: str) -> str | None:
    """
    Returns the path to the most recent dashboard snapshot for a camera, or None if absent.
    """
    path = os.path.join(CACHE_FOLDER, f"dashboard_{camera_id}.jpg")
    if os.path.exists(path):
        return path
    return None
