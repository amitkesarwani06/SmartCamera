# Stores conversation context

context = {
    "last_camera_name": None,
    "last_action": None
}


def set_last_camera(camera_name: str):
    context["last_camera_name"] = camera_name


def get_last_camera():
    return context.get("last_camera_name")


def set_last_action(action: str):
    context["last_action"] = action


def get_last_action():
    return context.get("last_action")
