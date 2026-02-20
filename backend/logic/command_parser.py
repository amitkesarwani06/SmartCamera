import json
import re


# Keyword-based fallback rules: (keywords, action, extra_field)
KEYWORD_RULES = [
    # add_camera: "add camera", "add a new camera", "new camera"
    (["add", "camera"],         "add_camera"),
    (["new", "camera"],         "add_camera"),
    # add_place: "add place", "add a new place", "new place"
    (["add", "place"],          "add_place"),
    (["new", "place"],          "add_place"),
    # show_camera: "show camera", "open camera", "display camera"
    (["show", "camera"],        "show_camera"),
    (["open", "camera"],        "show_camera"),
    (["display", "camera"],     "show_camera"),
    # show_place: "show place", "cameras in/at <place>"
    (["show", "place"],         "show_place"),
    (["cameras", "in"],         "show_place"),
    (["cameras", "at"],         "show_place"),
    # analyze_camera
    (["analyze"],               "analyze_camera"),
    (["what", "happening"],     "analyze_camera"),
    (["what's", "happening"],   "analyze_camera"),
    # detect_person
    (["detect", "person"],      "detect_person"),
    (["any", "person"],         "detect_person"),
    (["anyone"],                "detect_person"),
    (["somebody"],              "detect_person"),
    # detect_motion
    (["detect", "motion"],      "detect_motion"),
    (["any", "motion"],         "detect_motion"),
    (["movement"],              "detect_motion"),
    # count_objects
    (["count"],                 "count_objects"),
    (["how", "many"],           "count_objects"),
    # describe_scene
    (["describe"],              "describe_scene"),
    (["what", "see"],           "describe_scene"),
    (["what", "going", "on"],   "describe_scene"),
    # Generic fallback: just "open" or "show" without "camera" keyword
    # These MUST be last so specific rules above take priority
    (["open"],                  "show_camera"),
    (["show"],                  "show_camera"),
]

# Common place/camera names to extract from transcripts
ENTITY_WORDS_TO_SKIP = {
    "add", "new", "a", "the", "camera", "place", "show", "open", "display",
    "detect", "person", "motion", "count", "describe", "scene", "analyze",
    "what", "is", "happening", "in", "at", "to", "on", "for", "my", "please",
    "can", "you", "hey", "ok", "okay", "any", "are", "there", "how", "many",
    "an", "of", "from", "going", "see", "what's", "anyone", "somebody",
}


def _keyword_fallback(transcript: str):
    """
    Try to match the transcript against keyword rules.
    Returns a command dict or None if no match.
    """
    words = transcript.lower().strip().rstrip(".!?").split()

    for keywords, action in KEYWORD_RULES:
        if all(kw in words for kw in keywords):
            # Extract entity name: skip action/command words, keep name words in order
            entity_words = [w for w in words if w not in ENTITY_WORDS_TO_SKIP]
            entity_name = " ".join(entity_words).strip() or None

            # Also try extracting name by removing only the matched keywords
            # This preserves multi-word names like "Sri Lakshmi Narayan"
            skip_set = ENTITY_WORDS_TO_SKIP | set(keywords)
            full_entity_words = [w for w in words if w not in skip_set]
            full_entity_name = " ".join(full_entity_words).strip() or None

            # Use the longer / more complete name
            if full_entity_name and (not entity_name or len(full_entity_name) >= len(entity_name)):
                entity_name = full_entity_name

            result = {"action": action}

            if action in ("show_camera",):
                result["camera_id"] = entity_name
                result["camera_name"] = entity_name
            elif action in ("show_place", "add_place"):
                result["place_name"] = entity_name
            elif action in ("add_camera",):
                result["camera_name"] = entity_name
            elif action in ("analyze_camera", "detect_person", "detect_motion",
                            "count_objects", "describe_scene"):
                result["camera_name"] = entity_name

            return result

    return None


def process_command(raw_output: str, transcript: str = ""):

    try:

        raw_output = raw_output.strip()
        raw_output = raw_output.replace("```json", "")
        raw_output = raw_output.replace("```", "")

        # --- Step 1: Try keyword fallback on the original transcript FIRST ---
        # Small LLMs like qwen2:1b are unreliable for multi-word names.
        # Keyword fallback is faster and more accurate for common commands.
        if transcript:
            fallback = _keyword_fallback(transcript)
            if fallback and fallback.get("action", "unknown") != "unknown":
                print(f"[Parser] Keyword fallback matched: {fallback}")
                return {
                    "action": fallback.get("action", "unknown"),
                    "camera_id": fallback.get("camera_id"),
                    "camera_name": fallback.get("camera_name"),
                    "place_name": fallback.get("place_name"),
                    "object": fallback.get("object"),
                    "intent": fallback.get("intent")
                }

        # --- Step 2: Parse LLM JSON output ---
        json_match = re.search(r"\{.*\}", raw_output, re.DOTALL)

        if json_match:
            command = json.loads(json_match.group())

            action = command.get("action", "unknown")
            if action != "unknown":
                return {
                    "action": action,
                    "camera_id": command.get("camera_id"),
                    "camera_name": command.get("camera_name"),
                    "place_name": command.get("place_name"),
                    "object": command.get("object"),
                    "intent": command.get("intent")
                }

        return {
            "action": "unknown"
        }

    except Exception as e:

        print("Command parsing error:", e)

        # Last resort: try keyword fallback even on parse error
        if transcript:
            fallback = _keyword_fallback(transcript)
            if fallback:
                return fallback

        return {
            "action": "unknown"
        }

