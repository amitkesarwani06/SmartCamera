from sqlalchemy.orm import Session
from models import Place, Camera
from vision.vision_executor import process_vision
from logic.context_manager import set_last_camera, get_last_camera


async def execute_command(command: dict, db: Session):

    action = command.get("action")

    if not action:
        return {
            "success": False,
            "error": "No action provided"
        }

    try:

        # SHOW CAMERA
        if action == "show_camera":

            camera_name = command.get("camera_name")
            camera_id = command.get("camera_id")
            camera = None

            # If no name/id given, list all cameras or open if only one
            if not camera_name and not camera_id:
                all_cameras = db.query(Camera).all()
                if len(all_cameras) == 0:
                    return {
                        "success": False,
                        "error": "No cameras available. Add a camera first."
                    }
                elif len(all_cameras) == 1:
                    camera = all_cameras[0]
                else:
                    return {
                        "success": True,
                        "type": "camera_list",
                        "message": f"Found {len(all_cameras)} cameras. Please say a specific name.",
                        "cameras": [serialize_camera(c) for c in all_cameras]
                    }

            # Try finding by name first (full partial match)
            if not camera and camera_name:
                camera = db.query(Camera).filter(
                    Camera.name.ilike(f"%{camera_name}%")
                ).first()

                # Try progressively smaller substrings (n-gram approach)
                # This prioritises longer matches: "sri lakshmi narayan" before "sri lakshmi"
                if not camera:
                    words = camera_name.split()
                    matched = None
                    best_len = 0
                    # Try all contiguous substrings, longest first
                    for length in range(len(words), 0, -1):
                        for start in range(len(words) - length + 1):
                            phrase = " ".join(words[start:start + length])
                            result = db.query(Camera).filter(
                                Camera.name.ilike(f"%{phrase}%")
                            ).first()
                            if result and length > best_len:
                                matched = result
                                best_len = length
                        if matched:
                            break  # Stop at longest match found
                    camera = matched

            # Fall back to ID match
            if not camera and camera_id:
                camera = db.query(Camera).filter(
                    Camera.id == camera_id
                ).first()

            if not camera:
                return {
                    "success": False,
                    "error": "Camera not found"
                }

            return {
                "success": True,
                "type": "camera",
                "data": serialize_camera(camera)
            }

        # SHOW PLACE CAMERAS
        elif action == "show_place":

            place_name = command.get("place_name")

            place = db.query(Place).filter(
                Place.name.ilike(f"%{place_name}%")
            ).first()

            if not place:
                return {
                    "success": False,
                    "error": "Place not found"
                }

            cameras = db.query(Camera).filter(
                Camera.placeId == place.id
            ).all()

            return {
                "success": True,
                "type": "place_cameras",
                "place": serialize_place(place),
                "cameras": [serialize_camera(c) for c in cameras]
            }

        # ADD PLACE
        elif action == "add_place":

            place_name = command.get("place_name")

            new_place = Place(
                name=place_name,
                location="",
                description="",
                cameras=0
            )

            db.add(new_place)
            db.commit()
            db.refresh(new_place)

            return {
                "success": True,
                "type": "place_created",
                "data": serialize_place(new_place)
            }

        # ADD CAMERA
        elif action == "add_camera":

            camera_name = command.get("camera_name") or "New Camera"
            place_name = command.get("place_name")

            place_id = None
            if place_name:
                place = db.query(Place).filter(
                    Place.name.ilike(f"%{place_name}%")
                ).first()
                if place:
                    place_id = place.id

            new_camera = Camera(
                name=camera_name,
                streamUrl="",
                type="CCTV",
                status="offline",
                placeId=place_id
            )

            db.add(new_camera)
            db.commit()
            db.refresh(new_camera)

            return {
                "success": True,
                "type": "camera_created",
                "data": serialize_camera(new_camera)
            }

        # VISION ACTIONS
        elif action in [
            "analyze_camera",
            "detect_person",
            "describe_scene",
            "detect_motion",
            "count_objects"
        ]:

            camera_name = command.get("camera_name")
            #use last camera if not provided
            if not camera_name:
                camera_name = get_last_camera()

            if not camera_name:
                return {
                    "success": False,
                    "error": "Camera name not provided"
                }

            camera = db.query(Camera).filter(
                Camera.name.ilike(f"%{camera_name}%")
            ).first()

            if not camera:
                return {
                    "success": False,
                    "error": "Camera not found"
                }
            #save context
            set_last_camera(camera.name)
            return await process_vision(camera.streamUrl, command)

        # UNKNOWN ACTION
        else:
            return {
                "success": False,
                "error": f"Unknown action: {action}"
            }

    except Exception as e:

        print("Command execution error:", e)

        return {
            "success": False,
            "error": str(e)
        }


def serialize_place(place):

    return {
        "id": place.id,
        "name": place.name,
        "location": place.location,
        "description": place.description,
        "cameras": place.cameras
    }


def serialize_camera(camera):

    return {
        "id": camera.id,
        "name": camera.name,
        "streamUrl": camera.streamUrl,
        "type": camera.type,
        "status": camera.status,
        "placeId": camera.placeId
    }
