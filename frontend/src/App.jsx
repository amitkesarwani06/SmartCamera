import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import AddCameraModal from './components/AddCameraModal';
import VoiceAssistantFAB from './components/VoiceAssistantFAB';
import VideoPlayerModal from './components/VideoPlayerModal';
import { getCameras, createCamera, deleteCamera } from './api/client';

function App() {
  const [cameras, setCameras] = useState([]);
  const [placedCameras, setPlacedCameras] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingCamera, setViewingCamera] = useState(null);

  // Fetch cameras from backend on mount
  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCameras();
      setCameras(data);
    } catch (err) {
      console.error('Failed to load cameras:', err);
      setError('Failed to load cameras. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Drag start: store camera data
  const handleDragStart = (e, camera) => {
    e.dataTransfer.setData('camera', JSON.stringify(camera));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Drag over: allow drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Drop: place camera at coordinates
  const handleDrop = (e) => {
    e.preventDefault();
    const cameraData = e.dataTransfer.getData('camera');

    if (cameraData) {
      try {
        const camera = JSON.parse(cameraData);
        // Calculate position relative to the canvas
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newPlacedCamera = {
          ...camera,
          instanceId: Date.now(), // unique ID for placed instance
          x,
          y
        };

        setPlacedCameras((prev) => [...prev, newPlacedCamera]);
      } catch (err) {
        console.error('Failed to parse camera data on drop', err);
      }
    }
  };

  const handleAddCamera = async (newCameraData) => {
    try {
      const newCamera = await createCamera(newCameraData);
      setCameras((prev) => [...prev, newCamera]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to add camera:', err);
      alert('Failed to add camera. Please try again.');
    }
  };

  // Only remove from canvas (unplace), keep in DB & sidebar
  const handleUnplaceCamera = (cameraId) => {
    setPlacedCameras((prev) => prev.filter(c => c.id !== cameraId));
  };

  // Permanently delete from DB + sidebar + canvas
  const handleDeleteCamera = async (cameraId) => {
    try {
      await deleteCamera(cameraId);
      setCameras((prev) => prev.filter(c => c.id !== cameraId));
      setPlacedCameras((prev) => prev.filter(c => c.id !== cameraId));
    } catch (err) {
      console.error('Failed to delete camera:', err);
      alert('Failed to delete camera. Please try again.');
    }
  };

  const handleToggleVoice = () => {
    setIsListening((prev) => !prev);
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      <Navbar />

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400">Loading cameras...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadCameras}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              cameras={cameras}
              onDragStart={handleDragStart}
              onAddCamera={() => setIsModalOpen(true)}
              onDeleteCamera={handleDeleteCamera}
            />

            <Canvas
              placedCameras={placedCameras}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onRemoveCamera={handleUnplaceCamera}
              onViewCamera={(cam) => setViewingCamera(cam)}
            />
          </div>

          <VoiceAssistantFAB
            isListening={isListening}
            onToggle={handleToggleVoice}
            onCameraFound={(cam) => setViewingCamera(cam)}
            onCamerasChanged={loadCameras}
          />

          {isModalOpen && (
            <AddCameraModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onAddCamera={handleAddCamera}
            />
          )}

          {viewingCamera && (
            <VideoPlayerModal
              camera={viewingCamera}
              onClose={() => setViewingCamera(null)}
              onCameraUpdated={loadCameras}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
