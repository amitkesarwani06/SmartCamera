# Frontend-Backend Integration Guide

## ✅ Status: FULLY INTEGRATED

The frontend is **now fully connected** to the backend with real data and functional voice assistant.

---

## 🎯 What's Been Connected

### 1. **Camera Management (LIVE)**
- ✅ Fetches real cameras from backend database on startup
- ✅ Adds new cameras via backend API
- ✅ Deletes cameras from database
- ✅ Updates camera status in real-time

**API Used:** `/cameras` endpoints via `getCameras()`, `createCamera()`, `deleteCamera()`

### 2. **Voice Assistant (FULLY FUNCTIONAL)**
- ✅ Records audio from microphone
- ✅ Sends audio to backend `/voice` endpoint
- ✅ Processes voice commands using:
  - Speech-to-text (Deepgram STT)
  - LLM processing (Qwen2)
  - Command execution logic
- ✅ Returns transcribed text + response
- ✅ Text-to-speech response back to user
- ✅ Handles silence detection (auto-stops after 2 seconds)

**API Used:** `/voice` endpoint via `processVoiceCommand()`

### 3. **API Client Centralization**
- ✅ All API calls now use centralized `client.js`
- ✅ VoiceAssistantFAB updated to use `processVoiceCommand()`
- ✅ Consistent error handling across frontend

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (frontend)
- Python 3.10+ (backend)
- Microphone access (browser permission)

### Step 1: Start Backend
```powershell
cd e:\Smartcamera\backend
./setup_backend.bat    # One-time setup only
./start_backend.bat    # Start server
```

Expected output:
```
Starting Backend Server...
Backend will run on: http://localhost:8000
```

### Step 2: Start Frontend
```powershell
cd e:\Smartcamera\frontend
npm install             # One-time setup only
npm run dev            # Start dev server
```

Expected output:
```
VITE v... ready in ... ms
➜  Local:   http://localhost:5173
```

### Step 3: Open in Browser
Visit: `http://localhost:5173`

---

## 🎤 Testing Voice Assistant

1. **Click the Microphone Button** (bottom-right corner)
2. **Speak a command**, e.g.:
   - "Show me the living room camera"
   - "Add a new place called kitchen"
   - "How many cameras do I have?"
   - "List all places"

3. **Listen for Response** (text-to-speech will play)

### Voice Commands Examples
- `show_camera` - Display a specific camera
- `show_place` - Show cameras in a place
- `add_place` - Create a new place
- `add_camera` - Add a camera
- `analyze_camera` - Analyze camera scene
- `detect_person` - Person detection
- `detect_motion` - Motion detection

---

## 📊 Data Flow

```
User speaks
    ↓
Microphone captures audio (WebRTC)
    ↓
Frontend records → Sends to /voice endpoint
    ↓
Backend receives audio blob
    ↓
Deepgram STT converts to text
    ↓
LLM (Qwen2) processes command
    ↓
Command executor performs action (query DB/vision)
    ↓
Response sent back to frontend
    ↓
Text-to-speech plays response
```

---

## 🔧 Configuration

### Frontend Environment Variables
Create `.env.local` in `frontend/` folder:
```
VITE_API_BASE_URL=http://localhost:8000
```

### Backend Configuration
- **Port:** 8000
- **Database:** SQLite (database.db)
- **LLM Model:** Qwen2:1b (via Ollama)
- **STT Service:** Deepgram (requires API key in `.env`)

---

## 🐛 Troubleshooting

### ❌ "Could not reach backend" Error
- Check if backend is running on port 8000
- Verify `VITE_API_BASE_URL` is correct
- Check browser console for CORS issues

### ❌ Microphone Not Working
- Grant permission when browser asks
- Check browser privacy settings
- Ensure HTTPS or localhost (required for microphone access)

### ❌ No Response from Voice Command
- Check backend console for errors
- Verify Deepgram API key is set (if using cloud STT)
- Check if Ollama is running (for LLM processing)

### ❌ Frontend Shows "Failed to load cameras"
- Verify backend is running
- Check network tab in browser DevTools
- Ensure database has cameras (add one via UI)

---

## 📝 Recent Changes

1. **Updated VoiceAssistantFAB.jsx**
   - Removed hardcoded `fetch()` calls
   - Now uses centralized `processVoiceCommand()` from API client
   - Cleaner error handling and consistency

2. **API Client Functions**
   - `processVoiceCommand(audioBlob)` - Send audio and get response
   - `getCameras()` - Fetch all cameras
   - `createCamera(data)` - Add new camera
   - `deleteCamera(id)` - Remove camera
   - `getPlaces()` - Fetch all places
   - `createPlace(data)` - Add new place

---

## ✨ Features Enabled

- ✅ Real-time camera list from database
- ✅ Voice-to-command processing
- ✅ Voice response with text-to-speech
- ✅ Silence detection (auto-stop after 2 seconds)
- ✅ Recording indicator UI
- ✅ Error messages with recovery options
- ✅ Microphone permission handling
- ✅ Centralized API client

---

## 🎯 Next Steps (Optional)

1. Add WebSocket support for real-time camera feeds
2. Implement face recognition via vision endpoints
3. Add push notifications for alerts
4. Support additional voice providers (Google, Azure)
5. Improve LLM accuracy with fine-tuning

---

## 📞 Support

Check logs:
- **Frontend:** Browser DevTools Console
- **Backend:** Terminal/Console where you ran `start_backend.bat`
- **Database:** `backend/database.db` (SQLite)

