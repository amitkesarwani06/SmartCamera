import asyncio
import ollama


# ── Shared asyncio loop for blocking ollama calls ──────────────────────────

def _call_ollama(model: str, messages: list, options: dict) -> str:
    """Synchronous wrapper — called via run_in_executor so it doesn't block the event loop."""
    response = ollama.chat(model=model, messages=messages, options=options)
    return response["message"]["content"]


async def _async_ollama(model: str, messages: list, options: dict | None = None) -> str:
    """Non-blocking async wrapper around ollama.chat."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: _call_ollama(model, messages, options or {})
    )


# ── Image preprocessing ────────────────────────────────────────────────────

def _preprocess_image(image_path: str, max_dim: int = 720, max_kb: int = 300) -> str:
    """
    Resizes image to max_dim (default 720p) and compresses to under max_kb.
    Returns either original path or a temp resized path.
    Does not modify the original file.
    """
    try:
        from PIL import Image
        import io, os, tempfile

        img = Image.open(image_path)

        # Resize if larger than max_dim on any side
        w, h = img.size
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        # Convert to RGB if needed (e.g. RGBA PNG)
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Save to temp file, compressing until under max_kb
        quality = 85
        while quality >= 40:
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=quality)
            if len(buf.getvalue()) <= max_kb * 1024:
                break
            quality -= 10

        tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        tmp.write(buf.getvalue())
        tmp.close()
        print(f"[VLM] Image preprocessed → {img.size[0]}x{img.size[1]}, {len(buf.getvalue())//1024}KB")
        return tmp.name

    except Exception as e:
        print(f"[VLM] Image preprocess warning: {e} — using original")
        return image_path


def _validate_image(image_path: str) -> str | None:
    """
    Validates the image before sending to VLM.
    Returns error string if image is black/empty/too small, else None.

    LLaVA outputs <unk> garbage tokens when given:
    - Black/empty frames (mean pixel value < 5)
    - Tiny files < 1KB (corrupt or incomplete)
    """
    import os
    try:
        size_kb = os.path.getsize(image_path) / 1024
        if size_kb < 1.0:
            return f"Image too small ({size_kb:.1f}KB) — likely corrupt or empty frame"

        from PIL import Image
        import numpy as np
        img = Image.open(image_path).convert('RGB')
        arr = np.array(img)
        mean_brightness = arr.mean()
        if mean_brightness < 15.0:
            return f"Image is nearly black (brightness={mean_brightness:.1f}) — stream not ready"

        return None  # Image is valid
    except Exception as e:
        return f"Image validation error: {e}"


def _sanitize_vlm_output(result: str) -> str:
    """
    Detects garbage/empty VLM output (e.g. <unk> tokens, lone punctuation)
    and replaces with a clean SKIPPED message.
    LLaVA is known to emit these on low-quality or confusing frames.
    """
    import re
    stripped = result.strip()

    # Too short to be a real analysis
    if len(stripped) < 10:
        print(f"[VLM] Output too short ({len(stripped)} chars), treating as garbage: {repr(stripped)}")
        return f"STATUS: SKIPPED — VLM returned invalid output ({repr(stripped)})"

    # Contains known garbage tokens from LLaVA
    garbage_patterns = ["<unk>", "unk>", "\u2406", "\ufffd"]
    if any(tok in stripped for tok in garbage_patterns):
        print(f"[VLM] Garbage tokens detected in output: {repr(stripped[:80])}")
        return f"STATUS: SKIPPED — VLM returned invalid output (garbage tokens)"

    # Only punctuation/whitespace (no actual words)
    if not re.search(r'[a-zA-Z]{3,}', stripped):
        print(f"[VLM] No meaningful text in output: {repr(stripped[:80])}")
        return f"STATUS: SKIPPED — VLM returned invalid output (no text)"

    return result


# ── VLM analysis functions ─────────────────────────────────────────────────

MODEL = "llava:7b"
# Reduce context window to 2048 to save ~1GB RAM vs. default 4096
VLM_OPTIONS = {"num_ctx": 2048}


async def analyze_image(image_path: str, command: dict) -> str:
    """Forensic CCTV analysis for user-triggered vision commands."""
    action = command.get("action", "analyze")

    err = _validate_image(image_path)
    if err:
        print(f"[VLM] Skipping analyze_image: {err}")
        return f"[Skipped] {err}"

    processed = _preprocess_image(image_path)

    prompt = f"""You are a forensic CCTV analyst.
User intent: {action}

Analyze the image and provide:
1. Scene overview (indoor/outdoor, lighting, camera angle)
2. People: count, positions, posture, clothing, suspicious behavior
3. Vehicles: type, position, license plate if visible
4. Objects: list all visible items
5. Threat assessment: loitering, concealed objects, abnormal activity
6. Final security summary

Be concise but thorough."""

    result = await _async_ollama(MODEL, [
        {"role": "user", "content": prompt, "images": [processed]}
    ], VLM_OPTIONS)

    return _sanitize_vlm_output(result)


async def analyze_for_alert(image_path: str) -> str:
    """Quick alert detection — respond only ALERT or NORMAL."""
    err = _validate_image(image_path)
    if err:
        print(f"[VLM] Skipping analyze_for_alert: {err}")
        return f"NO THREAT DETECTED: {err}"

    processed = _preprocess_image(image_path)

    prompt = """You are a security monitoring AI. Look at this CCTV frame.

Check for: fire, smoke, intrusion, weapons, people in distress, suspicious bags, property damage.

Respond with ONE of:
- "ALERT DETECTED: [specific threat]"  ← if any threat found
- "NO THREAT DETECTED: [one-sentence scene summary]"  ← if scene is normal

Be direct. No extra text."""

    result = await _async_ollama(MODEL, [
        {"role": "user", "content": prompt, "images": [processed]}
    ], VLM_OPTIONS)
    return _sanitize_vlm_output(result)


async def analyze_industrial_safety(image_path: str) -> str:
    """Cotton mill safety check — PPE, fire, machinery, headcount."""
    err = _validate_image(image_path)
    if err:
        print(f"[VLM] Skipping analyze_industrial_safety: {err}")
        return f"STATUS: SKIPPED — {err}"

    processed = _preprocess_image(image_path)

    prompt = """You are an Industrial Safety AI for a cotton mill.

Analyze the CCTV frame and report:

1. PEOPLE COUNT: exact number and activity (working/loitering/moving)
2. PPE COMPLIANCE: are ALL workers wearing mask, gloves, vest? Flag anyone missing gear.
3. FIRE & SMOKE: spindle fires, embers, smoke, abnormal heat or sparks?
4. MACHINERY: are spinning frames/looms running or idle/jammed?

5. FINAL SUMMARY:
   - Start with "ALERT DETECTED: [violation]" if any issue found
   - Start with "STATUS: NORMAL" if everything is fine

Be precise. One finding per line."""

    result = await _async_ollama(MODEL, [
        {"role": "user", "content": prompt, "images": [processed]}
    ], VLM_OPTIONS)
    return _sanitize_vlm_output(result)


async def analyze_smart_security(image_path: str) -> str:
    """Advanced Nemotron-style reasoning for complex security events."""
    err = _validate_image(image_path)
    if err:
        return f"STATUS: SKIPPED — {err}"

    processed = _preprocess_image(image_path)

    prompt = """You are an NVIDIA Nemotron-powered Multimodal AI Agent specialized in security.
Analyze this CCTV frame for complex behavioral patterns.

THREAT CATEGORIES:
1. LOITERING: Person staying in one spot for an unusual amount of time without clear purpose.
2. UNATTENDED BAGGAGE: Bags/packages left alone without an owner in immediate proximity.
3. UNAUTHORIZED ACCESS: People entering restricted zones, climbing fences, or tailgating.
4. SUSPICIOUS BEHAVIOR: Concealing face, rapid movements, or observing security cameras.

OUTPUT FORMAT:
- If a threat is detected: "ALERT DETECTED: [Nature of threat]. Analysis: [Detailed 2-3 sentence reasoning process explaining the visual evidence]."
- If normal: "STATUS: NORMAL. Observation: [Brief 1-sentence description of the scene]."

Be decisive and focus on high-risk visual cues."""

    result = await _async_ollama(MODEL, [
        {"role": "user", "content": prompt, "images": [processed]}
    ], VLM_OPTIONS)
    return _sanitize_vlm_output(result)

