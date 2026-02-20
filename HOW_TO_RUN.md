# SmartCamera - How to Run

## ✅ Quick Start (Easiest Method)

**Double-click this file**: `START.ps1`

It will automatically:
1. Start the backend server (port 8000)
2. Start the frontend server (port 5173)
3. Open your browser to http://localhost:5173

---

## 🔧 Manual Start (If you prefer)

### Step 1: Start Backend

```bash
cd e:\Smartcamera\backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Backend will be running at**: http://localhost:8000

### Step 2: Start Frontend (in a new terminal)

```bash
cd e:\Smartcamera\frontend
npm run dev
```

**Frontend will be running at**: http://localhost:5173

### Step 3: Open Browser

Navigate to: **http://localhost:5173**

---

## 🌐 Accessing the Application

Once both servers are running:

1. **Open your web browser**
2. Go to: **http://localhost:5173**
3. You should see the SmartCamera interface!

---

## ❓ Troubleshooting

### Problem: "Can't access localhost"

**Solution:**
1. Check if both servers are running (you should see 2 PowerShell windows)
2. Wait 10-15 seconds for servers to fully start
3. Make sure no firewall is blocking ports 8000 or 5173

### Problem: "Backend not working"

**Check:**
```powershell
# In PowerShell, run:
Invoke-RestMethod -Uri "http://localhost:8000"
```

Should return: `{"status":"CCTV Voice Agent Backend Running"}`

### Problem: "Frontend shows error"

**Solution:**
1. Make sure backend is running first
2. Check the browser console (F12) for errors
3. Try clicking the "Retry" button on the error screen

---

## 🛑 Stopping the Servers

Simply close the PowerShell windows running the servers, or press **Ctrl+C** in each terminal.

---

## 📋 What Should You See?

**Backend Terminal:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Frontend Terminal:**
```
  VITE v7.3.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

**Browser (http://localhost:5173):**
- Black interface with camera management UI
- Sidebar on the left with camera list
- Canvas in the center for drag-and-drop
- Microphone button in bottom-right corner

---

## 🎯 First-Time Setup (Only if needed)

If servers don't start, you may need to install dependencies:

**Backend:**
```bash
cd e:\Smartcamera\backend
pip install -r requirements.txt
python init_db.py
```

**Frontend:**
```bash
cd e:\Smartcamera\frontend
npm install
```

Then use the `START.ps1` script!
