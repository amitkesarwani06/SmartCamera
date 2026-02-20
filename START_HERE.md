# 🚀 SmartCamera - Simple Start Guide

## ⚠️ The Problem

Your backend had a virtual environment copied from another project (D:\BitVivid\backend), so it couldn't start. I've fixed this!

## ✅ Solution: Use the New Batch Scripts

I've created simple `.bat` files for you to double-click:

---

### Step 1: Setup Backend (FIRST TIME ONLY)

📁 Navigate to: `e:\Smartcamera\backend\`

🖱️ **Double-click**: `setup_backend.bat`

This will:
- Remove the old virtual environment
- Create a new one with correct paths
- Install all dependencies

Wait for it to complete (might take 2-3 minutes)

---

### Step 2: Start Backend

📁 Navigate to: `e:\Smartcamera\backend\`

🖱️ **Double-click**: `start_backend.bat`

You'll see:
```
Starting Backend Server...
Backend will run on: http://localhost:8000
```

✅ Leave this window open!

---

### Step 3: Start Frontend

📁 Navigate to: `e:\Smartcamera\frontend\`

🖱️ **Double-click**: `start_frontend.bat`

You'll see:
```
Starting Frontend Server...
Frontend will run on: http://localhost:5173
```

✅ Leave this window open too!

---

### Step 4: Open Browser

Go to: **http://localhost:5173**

You should see the SmartCamera interface!

---

## 📝 Quick Commands (Alternative)

If you prefer using terminal:

**Backend:**
```bash
cd e:\Smartcamera\backend
setup_backend.bat          # First time only
start_backend.bat          # Every time
```

**Frontend:**
```bash
cd e:\Smartcamera\frontend  
start_frontend.bat
```

---

## ❓ Troubleshooting

### "Python not recognized"
- Install Python from python.org
- Make sure to check "Add Python  to PATH" during installation

### "Backend still not working"
- Make sure you ran `setup_backend.bat` first
- Check if you see any errors in the terminal window

### "Can't access localhost"
- Make sure both batch files are running (2 windows open)
- Wait 10-15 seconds for servers to start
- Try refreshing the browser

---

## 🎯 Files Created

| File | Location | Purpose |
|------|----------|---------|
| `setup_backend.bat` | `backend/` | Sets up virtual environment (run once) |
| `start_backend.bat` | `backend/` | Starts backend server |
| `start_frontend.bat` | `frontend/` | Starts frontend server |

---

## ✨ Next Steps

1. Run `setup_backend.bat` now (in backend folder)
2. Then run `start_backend.bat`
3. Then run `start_frontend.bat` (in frontend folder)
4. Open http://localhost:5173

Enjoy your SmartCamera app! 🎥
