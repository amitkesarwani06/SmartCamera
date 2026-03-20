"""
VMS Sync — fetches cameras & groups from the external VMS server
and upserts them into the local SmartCamera database.

Authentication flow (Keycloak OIDC):
  1. GET /api/oidc/authenticate/ → redirected to Keycloak login page
  2. Extract the Keycloak form action URL from the HTML
  3. POST username + password to the Keycloak action URL
  4. Keycloak redirects back to VMS with an auth code → Django session is created
  5. Use the session to fetch protected API endpoints
"""

import httpx
import re
import html
from sqlalchemy.orm import Session
from models import Place, Camera

VMS_BASE = "https://vms.cotcorpcontrol.in"
VMS_USERNAME = "admin"
VMS_PASSWORD = "admin@123"

# ── Authentication ──────────────────────────────────────────────────────────

async def _get_vms_session() -> httpx.AsyncClient:
    """
    Creates an authenticated httpx session against the VMS Django server
    via Keycloak OIDC login.
    """
    client = httpx.AsyncClient(
        base_url=VMS_BASE,
        verify=False,
        timeout=30.0,
        follow_redirects=True,
    )

    # Step 1: Hit the OIDC authenticate endpoint → Keycloak login page
    r = await client.get("/api/oidc/authenticate/?next=/api/swagger/")

    # Step 2: Extract Keycloak form action URL from HTML
    form_match = re.search(r'action=["\']([^"\']+)["\']', r.text)
    if not form_match:
        raise Exception("Could not find Keycloak login form action URL")

    # The action URL contains HTML-encoded ampersands (&amp;)
    keycloak_action_url = html.unescape(form_match.group(1))
    print(f"[VMS Auth] Keycloak login URL: {keycloak_action_url[:80]}...")

    # Step 3: POST credentials to Keycloak
    login_data = {
        "username": VMS_USERNAME,
        "password": VMS_PASSWORD,
    }
    r2 = await client.post(
        keycloak_action_url,
        data=login_data,
        headers={"Referer": str(r.url)},
    )

    # After successful auth, Keycloak redirects back to VMS with a session cookie
    print(f"[VMS Auth] Post-login status: {r2.status_code}, URL: {str(r2.url)[:80]}")

    # Verify login by checking if we can access a protected page
    test = await client.get("/api/swagger/")
    if test.status_code != 200:
        raise Exception(f"VMS login failed — Swagger returned {test.status_code}")

    print("[VMS Auth] Login successful ✓")
    return client


async def fetch_vms_cameras(client: httpx.AsyncClient) -> list:
    """Fetch camera list with group info from VMS."""
    r = await client.get("/api/camera/with-group-info/?format=json")
    r.raise_for_status()
    return r.json()


async def fetch_vms_groups(client: httpx.AsyncClient) -> dict:
    """Fetch all groups (factories) from VMS."""
    r = await client.get("/api/group/all-groups/?format=json")
    r.raise_for_status()
    return r.json()


# ── Sync Logic ──────────────────────────────────────────────────────────────

async def sync_vms_to_db(db: Session) -> dict:
    """
    Main sync function:
      1. Authenticate with VMS via Keycloak OIDC
      2. Fetch groups → upsert as Place rows
      3. Fetch cameras → upsert as Camera rows (linked to Place via group)
    Returns a summary dict with counts.
    """
    client = await _get_vms_session()

    try:
        groups_data = await fetch_vms_groups(client)
        cameras_data = await fetch_vms_cameras(client)
    finally:
        await client.aclose()

    groups = groups_data.get("groups", [])

    # ── Upsert Groups → Places ──
    places_created = 0
    places_updated = 0
    group_id_to_place = {}  # VMS group id → local Place

    for g in groups:
        vms_gid = g.get("id")
        existing = db.query(Place).filter(Place.vms_group_id == vms_gid).first()

        lat_val = _safe_float(g.get("lat"))
        long_val = _safe_float(g.get("long"))
        cam_count = len(g.get("cameras", []))

        if existing:
            existing.name = g.get("description") or g.get("group", "")
            existing.location = g.get("address", "")
            existing.lat = lat_val
            existing.long = long_val
            existing.cameras = cam_count
            group_id_to_place[vms_gid] = existing
            places_updated += 1
        else:
            new_place = Place(
                name=g.get("description") or g.get("group", ""),
                location=g.get("address", ""),
                description=f"VMS Group: {g.get('group', '')}",
                cameras=cam_count,
                lat=lat_val,
                long=long_val,
                vms_group_id=vms_gid,
            )
            db.add(new_place)
            db.flush()  # get the generated id
            group_id_to_place[vms_gid] = new_place
            places_created += 1

    # ── Build a mapping from VMS camera_name → group_id using groups data ──
    cam_name_to_group_id = {}
    for g in groups:
        for cam in g.get("cameras", []):
            cam_name_to_group_id[cam.get("camera_name")] = g.get("id")

    # ── Upsert Cameras ──
    cams_created = 0
    cams_updated = 0

    for c in cameras_data:
        vms_cid = c.get("id")
        existing = db.query(Camera).filter(Camera.vms_id == vms_cid).first()

        # Determine stream URL — rewrite internal K8s hostnames to public domain
        stream = _rewrite_stream_url(c.get("streaming_url", ""))
        if not stream:
            # Fallback to direct RTSP if streaming_url is empty
            stream = c.get("rtspurlmain") or ""

        # Map VMS status to local status
        status = "active" if c.get("status", "").upper() == "ON" else "offline"

        # Find the parent place
        cam_name = c.get("camera_name", "")
        gid = cam_name_to_group_id.get(cam_name)
        place = group_id_to_place.get(gid) if gid else None

        if existing:
            existing.name = c.get("camera_description") or cam_name
            existing.streamUrl = stream
            existing.status = status
            existing.placeId = place.id if place else existing.placeId
            cams_updated += 1
        else:
            new_cam = Camera(
                name=c.get("camera_description") or cam_name,
                streamUrl=stream,
                type="CCTV",
                status=status,
                placeId=place.id if place else None,
                vms_id=vms_cid,
            )
            db.add(new_cam)
            cams_created += 1

    db.commit()

    summary = {
        "places_created": places_created,
        "places_updated": places_updated,
        "cameras_created": cams_created,
        "cameras_updated": cams_updated,
        "total_groups": len(groups),
        "total_cameras": len(cameras_data),
    }
    print(f"[VMS Sync] Complete: {summary}")
    return summary


# ── Helpers ─────────────────────────────────────────────────────────────────

# Internal Kubernetes service hostname used inside the VMS cluster
_K8S_INTERNAL_HOST = "vms-app-service.xconnected.svc.cluster.local:8000"
# Public domain that proxies to the same service
_PUBLIC_HOST = "vms.cotcorpcontrol.in"


def _rewrite_stream_url(url: str) -> str:
    """
    Replaces internal Kubernetes service hostnames in VMS streaming URLs
    with the public-facing domain so they resolve from the user's machine.

    Example:
      IN:  http://vms-app-service.xconnected.svc.cluster.local:8000/api/go2rtc/35/api/stream.m3u8?...
      OUT: https://vms.cotcorpcontrol.in/api/go2rtc/35/api/stream.m3u8?...
    """
    if not url:
        return ""
    if _K8S_INTERNAL_HOST in url:
        url = url.replace(f"http://{_K8S_INTERNAL_HOST}", f"https://{_PUBLIC_HOST}")
        url = url.replace(f"https://{_K8S_INTERNAL_HOST}", f"https://{_PUBLIC_HOST}")
    return url


def _safe_float(val) -> float | None:
    """Convert a string or number to float, returning None on failure."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

