import os
import asyncio
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db
from models import Place, Camera

from ai.deepgram_stt import transcribe_audio
from logic.command_parser import process_command, _keyword_fallback
from logic.command_executor import execute_command

app = FastAPI()


# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/")
def root():
    return {"status": "CCTV Voice Agent Backend Running"}


# Voice endpoint
@app.post("/voice")
async def voice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    audio_bytes = await file.read()

    transcript = await transcribe_audio(audio_bytes)

    if not transcript:
        return {
            "success": False,
            "error": "Could not transcribe audio"
        }

    print(f"[Voice] Transcript: {transcript}")

    # ── Fast path: try keyword fallback FIRST (no LLM needed) ──────────────
    fallback = _keyword_fallback(transcript)
    if fallback and fallback.get("action", "unknown") != "unknown":
        print(f"[Voice] Fast path — keyword fallback: {fallback}")
        command = {
            "action": fallback.get("action", "unknown"),
            "camera_id": fallback.get("camera_id"),
            "camera_name": fallback.get("camera_name"),
            "place_name": fallback.get("place_name"),
            "object": fallback.get("object"),
            "intent": fallback.get("intent"),
        }
    else:
        # ── Slow path: call LLM in thread pool (non-blocking) ──────────────
        print("[Voice] Slow path — calling LLM...")
        loop = asyncio.get_event_loop()
        llm_output = await loop.run_in_executor(None, lambda: __import__('ollama').chat(
            model='qwen2:1b',
            messages=[
                {"role": "system", "content": __import__('ai.llm', fromlist=['SYSTEM_PROMPT']).SYSTEM_PROMPT},
                {"role": "user",   "content": transcript}
            ]
        ).get('message', {}).get('content', '{}'))
        command = process_command(llm_output, transcript)

    execution = await execute_command(command, db)

    return {
        "spoken_text": transcript,
        "command": command,
        "execution": execution
    }


# ── Text command endpoint (browser STT → text → instant response) ─────────────
@app.post("/command")
async def command_text(
    body: dict,
    db: Session = Depends(get_db)
):
    transcript = (body.get("text") or "").strip()

    if not transcript:
        return {"success": False, "error": "No text provided"}

    print(f"[Command] Transcript: {transcript}")

    # Fast path: keyword fallback (no LLM)
    fallback = _keyword_fallback(transcript)
    if fallback and fallback.get("action", "unknown") != "unknown":
        print(f"[Command] Fast path — keyword fallback: {fallback}")
        command = {
            "action": fallback.get("action", "unknown"),
            "camera_id": fallback.get("camera_id"),
            "camera_name": fallback.get("camera_name"),
            "place_name": fallback.get("place_name"),
            "object": fallback.get("object"),
            "intent": fallback.get("intent"),
        }
    else:
        # Slow path: LLM in thread pool
        print("[Command] Slow path — calling LLM...")
        loop = asyncio.get_event_loop()
        from ai.llm import SYSTEM_PROMPT
        import ollama
        llm_output = await loop.run_in_executor(
            None,
            lambda: ollama.chat(
                model="qwen2:1b",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": transcript}
                ]
            ).get("message", {}).get("content", "{}")
        )
        command = process_command(llm_output, transcript)

    execution = await execute_command(command, db)

    return {
        "spoken_text": transcript,
        "command": command,
        "execution": execution
    }


# GET places
@app.get("/places")
def get_places(db: Session = Depends(get_db)):

    places = db.query(Place).all()

    return places


# POST place
@app.post("/places")
def create_place(place: dict, db: Session = Depends(get_db)):

    new_place = Place(
        name=place.get("name"),
        location=place.get("location"),
        description=place.get("description"),
        cameras=place.get("cameras", 0)
    )

    db.add(new_place)
    db.commit()
    db.refresh(new_place)

    return new_place


# DELETE place
@app.delete("/places/{id}")
def delete_place(id: str, db: Session = Depends(get_db)):

    place = db.query(Place).filter(Place.id == id).first()

    if not place:
        raise HTTPException(404, "Place not found")

    db.delete(place)
    db.commit()

    return {"message": "Place deleted"}


# GET cameras
@app.get("/cameras")
def get_cameras(
    placeId: str = None,
    db: Session = Depends(get_db)
):

    if placeId:
        cameras = db.query(Camera).filter(Camera.placeId == placeId).all()
    else:
        cameras = db.query(Camera).all()

    return cameras


# POST camera
@app.post("/cameras")
def create_camera(camera: dict, db: Session = Depends(get_db)):

    new_camera = Camera(
        name=camera.get("name"),
        streamUrl=camera.get("streamUrl"),
        type=camera.get("type"),
        status=camera.get("status"),
        placeId=camera.get("placeId")
    )

    db.add(new_camera)
    db.commit()
    db.refresh(new_camera)

    return new_camera


# DELETE camera
@app.delete("/cameras/{id}")
def delete_camera(id: str, db: Session = Depends(get_db)):

    camera = db.query(Camera).filter(Camera.id == id).first()

    if not camera:
        raise HTTPException(404, "Camera not found")

    db.delete(camera)
    db.commit()

    return {"message": "Camera deleted"}


# PATCH camera (update fields like streamUrl)
@app.patch("/cameras/{id}")
def update_camera(id: str, updates: dict, db: Session = Depends(get_db)):

    camera = db.query(Camera).filter(Camera.id == id).first()

    if not camera:
        raise HTTPException(404, "Camera not found")

    if "streamUrl" in updates:
        camera.streamUrl = updates["streamUrl"]
    if "name" in updates:
        camera.name = updates["name"]
    if "status" in updates:
        camera.status = updates["status"]
    if "type" in updates:
        camera.type = updates["type"]

    db.commit()
    db.refresh(camera)

    return camera

from vision.vision_executor import process_vision

@app.get("/test-vlm")
async def test_vlm():

    result = await process_vision(
        "https://www.w3schools.com/html/mov_bbb.mp4"
    )

    return result
