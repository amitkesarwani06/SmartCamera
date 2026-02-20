import os
import httpx
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

DEEPGRAM_URL = "https://api.deepgram.com/v1/listen"


async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribe audio using Deepgram REST API directly.
    (Bypasses the deepgram-sdk which is broken on Python 3.13)
    """
    try:
        print(f"[Deepgram] Audio size: {len(audio_bytes)} bytes")

        params = {
            "model": "nova-2",
            "smart_format": "true",
            "punctuate": "true",
            "language": "en-IN",
            "detect_language": "false",
        }

        headers = {
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "audio/webm",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                DEEPGRAM_URL,
                params=params,
                headers=headers,
                content=audio_bytes,
            )

        if response.status_code != 200:
            print(f"[Deepgram] API error: {response.status_code} {response.text}")
            return ""

        data = response.json()

        transcript = (
            data["results"]["channels"][0]
            ["alternatives"][0]
            ["transcript"]
        )

        print("[Deepgram] Transcript:", transcript)

        return transcript.strip()

    except Exception as e:
        print("[Deepgram] ERROR:", str(e))
        return ""
