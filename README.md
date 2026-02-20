# SmartCamera - AI-Powered Camera Management System

A full-stack smart camera management system with voice command processing capabilities.

## 🏗️ Project Structure

```
Smartcamera/
├── backend/          # FastAPI backend with voice AI
│   ├── main.py      # Main API server
│   ├── models.py    # Database models
│   ├── database.py  # Database configuration
│   ├── ai/          # AI modules (Deepgram STT, LLM)
│   ├── logic/       # Command parsing & execution
│   └── vision/      # Vision processing
└── frontend/         # React/Vite frontend
    ├── src/
    │   ├── App.jsx           # Main app component
    │   └── components/       # UI components
    ├── package.json
    └── index.html
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd e:\Smartcamera\backend
   ```

2. **Activate virtual environment (if exists):**
   ```bash
   .\venv\Scripts\activate
   ```
   
   Or create a new one if needed:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize database:**
   ```bash
   python init_db.py
   ```

5. **Start the backend server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

Backend will be running at: **http://localhost:8000**

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd e:\Smartcamera\frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

Frontend will be running at: **http://localhost:5173**

## 🔑 Environment Variables

The backend requires a Deepgram API key for voice transcription. The key is already configured in `backend/.env`:

```env
DEEPGRAM_API_KEY=fc049164257c3ed9be5f1965e3a8727054545646
```

## 📡 API Endpoints

### Backend API (http://localhost:8000)

- `GET /` - Health check
- `POST /voice` - Process voice commands (audio file upload)
- `GET /places` - Get all places
- `POST /places` - Create a new place
- `DELETE /places/{id}` - Delete a place
- `GET /cameras` - Get all cameras (optional placeId filter)
- `POST /cameras` - Create a new camera
- `DELETE /cameras/{id}` - Delete a camera

## ⚠️ Current Integration Status

**Status: Not Yet Integrated**

- ✅ Backend API is functional
- ✅ Frontend UI is functional
- ❌ Frontend currently uses **mock data** (not connected to backend)
- ❌ Voice assistant button is **UI-only** (no actual recording/API calls)

To fully integrate, the frontend needs to:
1. Add API client to call backend endpoints
2. Implement audio recording in VoiceAssistantFAB
3. Replace hardcoded data with API calls

## 🛠️ Tech Stack

**Backend:**
- FastAPI - Web framework
- SQLAlchemy - ORM
- SQLite - Database
- Deepgram - Speech-to-text
- Ollama - LLM for command processing

**Frontend:**
- React 19 - UI framework
- Vite - Build tool
- Tailwind CSS - Styling
- Lucide React - Icons

## 📝 Next Steps

Run the integration to connect frontend with backend APIs!
