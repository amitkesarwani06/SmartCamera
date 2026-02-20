import ollama


async def analyze_image(image_path: str, command: dict):

    action = command.get("action")

    prompt = f"""
    You are a CCTV analysis AI.

    User intent: {action}

    Analyze the CCTV image carefully.

    Detect and describe:

    - People
    - Vehicles
    - Motion
    - Suspicious activity
    - Objects

    Provide clear answer.
    """

    response = ollama.chat(
        model="llava:7b",
        messages=[
            {
                "role": "user",
                "content": prompt,
                "images": [image_path]
            }
        ]
    )

    return response["message"]["content"]
