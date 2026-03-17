# SmartCamera - How to Run

## ⚡ One-Click Start (Recommended)

**Double-click `START.ps1`** in `e:\Smartcamera\`

This automatically starts the backend, frontend, and opens the browser.

> [!IMPORTANT]
> **Prerequisites that must be running BEFORE starting:**
> - **Docker Desktop** must be open and running (green icon in system tray)
> - **Ollama** must be installed

---

## Step-by-Step Manual Start

### 1️⃣ Start MediaMTX (RTSP Server — for testing)
```powershell
cd e:\Smartcamera
docker compose up -d
```
Stream will be available at `rtsp://localhost:8554/sample`

---

### 2️⃣ Start Backend
```powershell
cd e:\Smartcamera\backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
Backend API: `http://localhost:8000`

---

### 3️⃣ Start Frontend *(new terminal)*
```powershell
cd e:\Smartcamera\frontend
npm run dev
```
Dashboard UI: `http://localhost:5173`

---

### 4️⃣ Open Browser
Navigate to **`http://localhost:5173`**

---

## What Should You See?

| Terminal | Success Message |
|----------|----------------|
| Backend  | `INFO: Uvicorn running on http://127.0.0.1:8000` |
| Backend  | `[Scheduler] Starting automation loop (Interval: 300s)` |
| Frontend | `VITE ready in XXX ms → Local: http://localhost:5173/` |

---

## Stopping Everything

| Component | Command |
|-----------|---------|
| Backend / Frontend | Press `Ctrl+C` in each terminal |
| MediaMTX Docker | `docker compose down` (from `e:\Smartcamera`) |

---

## First-Time Setup (only once)

```powershell
# Backend dependencies
cd e:\Smartcamera\backend
pip install -r requirements.txt
python init_db.py

# Frontend dependencies
cd e:\Smartcamera\frontend
npm install

# Pull AI models (takes time — do this once)
ollama pull llava:7b
ollama pull llama3.2:1b
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | Check the frontend port (5173 or 5174?) — both are now whitelisted in `main.py` |
| `model 'llava:7b' not found` | Run `ollama pull llava:7b` |
| `docker compose up -d` fails | Open Docker Desktop and wait for green icon |
| Backend won't start | Make sure venv is activated: `.\venv\Scripts\activate` |
