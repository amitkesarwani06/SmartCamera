# MediaMTX Docker Setup Guide

Set up a local RTSP server using **Docker** — no FFmpeg or native installation needed on your machine.

---

## Prerequisites

- **Docker Desktop** installed and running → [Download here](https://www.docker.com/products/docker-desktop)

---

## Step 1 — One-Time Setup

Open **PowerShell as Administrator** in `e:\Smartcamera\` and run:

```powershell
.\setup_mediamtx_docker.ps1
```

This script will:
1. Verify Docker is running
2. Create `mediamtx\videos\` directory for your video files
3. Pull the `bluenviron/mediamtx:latest` Docker image

---

## Step 2 — Add a Sample Video

Place a video file named **`sample.mp4`** inside:

```
e:\Smartcamera\mediamtx\videos\sample.mp4
```

> [!IMPORTANT]
> This file is bind-mounted into the container at `/videos/sample.mp4`. Without it, the stream will not start.

---

## Step 3 — Start MediaMTX

From `e:\Smartcamera\`, run:

```powershell
docker compose up -d
```

Verify it's running:

```powershell
docker compose logs -f mediamtx
```

You should see `RTSP server listening on :8554`.

---

## Step 4 — Add Camera to Dashboard

1. Open your **SmartCamera Dashboard**
2. Click **"Add Camera"** and fill in:

   | Field      | Value                          |
   |------------|-------------------------------|
   | Name       | Cotton Mill Sample            |
   | Stream URL | `rtsp://localhost:8554/sample` |
   | Type       | RTSP                          |

3. Your AI Vision System will now analyze this feed every 5 minutes! 🎉

---

## Useful Commands

| Action              | Command                                   |
|---------------------|-------------------------------------------|
| Start container     | `docker compose up -d`                    |
| Stop container      | `docker compose down`                     |
| View live logs      | `docker compose logs -f mediamtx`         |
| Restart container   | `docker compose restart mediamtx`         |
| Check port 8554     | `docker ps`                               |

---

## Exposed Ports

| Port   | Protocol | URL                            |
|--------|----------|--------------------------------|
| `8554` | RTSP     | `rtsp://localhost:8554/sample` |
| `8888` | HLS      | `http://localhost:8888/sample` |
| `8889` | WebRTC   | `http://localhost:8889/sample` |
| `9997` | API      | `http://localhost:9997/v3/config/get` |
