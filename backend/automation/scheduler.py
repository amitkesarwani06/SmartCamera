"""
Automation scheduler — runs monitoring cycles at a configurable interval.

- Reads interval from SettingsManager on EACH tick (hot-reload)
- Tracks last_run / next_run for the status API
- Supports start / stop / toggle via module-level functions
"""
import asyncio
import logging
from datetime import datetime, timezone

from automation.monitor import run_monitoring
from settings import get_interval, is_automation_enabled

# ── State ───────────────────────────────────────────────────────────────────

is_running = False
last_run_time: str | None = None      # ISO timestamp of last completed cycle
next_run_time: str | None = None      # ISO timestamp of next scheduled cycle
_task: asyncio.Task | None = None      # Reference to the running asyncio task
_lock = asyncio.Lock()                 # Ensures only ONE monitoring cycle at a time


def get_status() -> dict:
    """Return scheduler state for the /automation/status endpoint."""
    return {
        "is_running": is_running,
        "last_run_time": last_run_time,
        "next_run_time": next_run_time,
        "interval_seconds": get_interval(),
    }


# ── Core loop ───────────────────────────────────────────────────────────────

async def _scheduler_loop():
    global is_running, last_run_time, next_run_time

    is_running = True
    interval = get_interval()
    print(f"[Scheduler] Starting automation loop (Interval: {interval}s)")

    while is_running:
        # Re-read interval each tick so UI changes take effect immediately
        interval = get_interval()

        # Check if automation is enabled in settings
        if not is_automation_enabled():
            print("[Scheduler] Automation disabled in settings — sleeping...")
            next_run_time = None
            await asyncio.sleep(interval)
            continue

        # If a previous cycle is still running, skip this tick
        if _lock.locked():
            print("[Scheduler] Previous cycle still running — skipping.")
            await asyncio.sleep(interval)
            continue

        async with _lock:
            try:
                await run_monitoring()
                last_run_time = datetime.now(timezone.utc).isoformat()
            except Exception as e:
                print(f"[Scheduler] Error during monitoring: {e}")

        # Calculate next run time
        next_run_time = datetime.now(timezone.utc).isoformat()
        await asyncio.sleep(interval)


# ── Public API ──────────────────────────────────────────────────────────────

async def start_scheduler():
    """Start the scheduler loop (called from FastAPI startup)."""
    global _task, is_running
    if _task and not _task.done():
        print("[Scheduler] Already running.")
        return
    is_running = True
    _task = asyncio.create_task(_scheduler_loop())


async def stop_scheduler():
    """Stop the scheduler loop."""
    global is_running, _task, next_run_time
    is_running = False
    next_run_time = None
    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
    _task = None
    print("[Scheduler] Stopped.")


async def toggle_scheduler() -> bool:
    """Toggle scheduler on/off. Returns new is_running state."""
    global is_running
    if is_running:
        await stop_scheduler()
        return False
    else:
        await start_scheduler()
        return True