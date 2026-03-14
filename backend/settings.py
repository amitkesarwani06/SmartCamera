"""
Dynamic Automation Settings — persisted to automation_config.json.

Provides get_settings() / update_settings() for the REST API,
plus individual accessors that the scheduler & monitor import directly.
"""
import os, json, threading

_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "automation_config.json")
_lock = threading.Lock()

# ── Defaults (used when no config file exists) ──────────────────────────────

DEFAULTS = {
    "interval_seconds": 300,       # 5 minutes (range: 60–1800)
    "max_screenshots": 15,         # keep last N cached images (range: 5–50)
    "alert_keywords": [
        "fire", "smoke", "suspicious", "crowd", "motion",
        "missing PPE", "no gloves", "no mask", "no vest",
        "machine idle", "static machine", "broken yarn", "spinning malfunction"
    ],
    "enable_webhook": False,
    "webhook_url": "",
    "enable_email": False,
    "automation_enabled": True,
}


def _load() -> dict:
    """Load settings from JSON file, falling back to DEFAULTS."""
    if os.path.exists(_CONFIG_PATH):
        try:
            with open(_CONFIG_PATH, "r") as f:
                saved = json.load(f)
            # Merge with defaults so new keys are always present
            merged = {**DEFAULTS, **saved}
            return merged
        except Exception as e:
            print(f"[Settings] Error reading config: {e} — using defaults")
    return {**DEFAULTS}


def _save(data: dict):
    """Persist settings to JSON file."""
    with open(_CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=2)


# ── Public API ──────────────────────────────────────────────────────────────

def get_settings() -> dict:
    """Return all current settings."""
    with _lock:
        return _load()


def update_settings(partial: dict) -> dict:
    """Merge partial updates into settings and persist."""
    with _lock:
        current = _load()
        current.update(partial)
        _save(current)
        print(f"[Settings] Updated: {list(partial.keys())}")
        return current


# ── Convenience accessors (used by scheduler / monitor) ─────────────────────

def get_interval() -> int:
    return get_settings().get("interval_seconds", DEFAULTS["interval_seconds"])


def get_max_screenshots() -> int:
    return get_settings().get("max_screenshots", DEFAULTS["max_screenshots"])


def get_alert_keywords() -> list:
    return get_settings().get("alert_keywords", DEFAULTS["alert_keywords"])


def is_automation_enabled() -> bool:
    return get_settings().get("automation_enabled", True)


def is_webhook_enabled() -> bool:
    return get_settings().get("enable_webhook", False)


def get_webhook_url() -> str:
    return get_settings().get("webhook_url", "")


# ── Backward-compatible constants (for any imports that still use them) ──────
# These read from the dynamic config so old code doesn't break.

AUTOMATION_INTERVAL_SECONDS = DEFAULTS["interval_seconds"]
MAX_SCREENSHOTS = DEFAULTS["max_screenshots"]
ALERT_KEYWORDS = DEFAULTS["alert_keywords"]
ENABLE_WEBHOOK = DEFAULTS["enable_webhook"]
WEBHOOK_URL = DEFAULTS["webhook_url"]
ENABLE_EMAIL = DEFAULTS["enable_email"]
