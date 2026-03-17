import { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import FactorySidebar from './components/FactorySidebar';
import CameraGrid from './components/CameraGrid';
import AddCameraModal from './components/AddCameraModal';
import AddPlaceModal from './components/AddPlaceModal';
import SmartAlertsPanel from './components/SmartAlertsPanel';
import VoiceAssistantFAB from './components/VoiceAssistantFAB';
import SettingsPanel from './components/SettingsPanel';
import VideoPlayerModal from './components/VideoPlayerModal';
import { getCameras, getPlaces, createCamera, deleteCamera, updateCamera, createPlace, deletePlace } from './api/client';

function App() {
  const [cameras, setCameras] = useState([]);
  const [places, setPlaces] = useState([]);
  const [placedCameras, setPlacedCameras] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [editCamera, setEditCamera] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingCamera, setViewingCamera] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [addCameraPlaceId, setAddCameraPlaceId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'intelligence'
  const [alerts, setAlerts] = useState([]); // Shared alerts state

  // ── CCTV Dashboard State ──
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [factoryCameras, setFactoryCameras] = useState([]);
  const [factoryCamerasLoading, setFactoryCamerasLoading] = useState(false);

  // Fetch cameras, places & alerts from backend on mount
  useEffect(() => {
    loadCameras();
    loadPlaces();
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000); // Polling for new intelligence
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const resp = await fetch('http://localhost:8000/alerts');
      const data = await resp.json();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };


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

  const loadPlaces = async () => {
    try {
      const data = await getPlaces();
      setPlaces(data);
    } catch (err) {
      console.error('Failed to load places:', err);
    }
  };

  // ── Camera-to-place count mapping ──
  const cameraCounts = useMemo(() => {
    const counts = {};
    places.forEach(p => {
      const placeCams = cameras.filter(c => c.placeId === p.id);
      counts[p.id] = {
        total: placeCams.length,
        online: placeCams.filter(c => c.status === 'active').length,
      };
    });
    return counts;
  }, [cameras, places]);

  // ── Factory selection → load cameras ──
  const handleSelectFactory = async (factory) => {
    setSelectedFactory(factory);
    setFactoryCamerasLoading(true);
    try {
      const cams = await getCameras(factory.id);
      setFactoryCameras(cams);
    } catch (err) {
      console.error('Failed to load factory cameras:', err);
      setFactoryCameras([]);
    } finally {
      setFactoryCamerasLoading(false);
    }
  };

  const handleClearGrid = () => {
    setSelectedFactory(null);
    setFactoryCameras([]);
  };

  // ── Canvas drag-and-drop (existing) ──
  const handleDragStart = (e, camera) => {
    e.dataTransfer.setData('camera', JSON.stringify(camera));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const cameraData = e.dataTransfer.getData('camera');

    if (cameraData) {
      try {
        const camera = JSON.parse(cameraData);
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newPlacedCamera = {
          ...camera,
          instanceId: Date.now(),
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
      setAddCameraPlaceId(null);
      // Refresh factory cameras if a factory is selected
      if (selectedFactory) {
        const cams = await getCameras(selectedFactory.id);
        setFactoryCameras(cams);
      }
    } catch (err) {
      console.error('Failed to add camera:', err);
      alert('Failed to add camera. Please try again.');
    }
  };

  const handleAddPlace = async (placeData) => {
    try {
      const newPlace = await createPlace(placeData);
      setPlaces((prev) => [...prev, newPlace]);
      setIsPlaceModalOpen(false);
    } catch (err) {
      console.error('Failed to add place:', err);
      alert('Failed to add factory. Please try again.');
    }
  };

  const handleDeletePlace = async (id) => {
    try {
      await deletePlace(id);
      setPlaces((prev) => prev.filter(p => p.id !== id));
      if (selectedFactory?.id === id) {
        setSelectedFactory(null);
        setFactoryCameras([]);
      }
    } catch (err) {
      console.error('Failed to delete place:', err);
      alert('Failed to delete factory. Please try again.');
    }
  };

  const handleUnplaceCamera = (instanceId) => {
    setPlacedCameras((prev) => prev.filter(c => c.instanceId !== instanceId));
  };

  const handleDeleteCamera = async (cameraId) => {
    try {
      await deleteCamera(cameraId);
      setCameras((prev) => prev.filter(c => c.id !== cameraId));
      setPlacedCameras((prev) => prev.filter(c => c.id !== cameraId));
      setFactoryCameras((prev) => prev.filter(c => c.id !== cameraId));
    } catch (err) {
      console.error('Failed to delete camera:', err);
      alert('Failed to delete camera. Please try again.');
    }
  };

  const handleEditCamera = (camera) => {
    setEditCamera(camera);
    setIsModalOpen(true);
  };

  const handleUpdateCamera = async (cameraId, updates) => {
    try {
      const updated = await updateCamera(cameraId, updates);
      setCameras((prev) => prev.map(c => c.id === cameraId ? updated : c));
      setPlacedCameras((prev) => prev.map(c => c.id === cameraId ? { ...c, ...updated } : c));
      setFactoryCameras((prev) => prev.map(c => c.id === cameraId ? { ...c, ...updated } : c));
      setEditCamera(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to update camera:', err);
      alert('Failed to update camera. Please try again.');
    }
  };

  const handleToggleVoice = () => {
    setIsListening((prev) => !prev);
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      <Navbar 
        onShowSettings={() => setIsSettingsOpen(true)} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'dashboard' ? (
            <>
              <FactorySidebar
                factories={places}
                selectedFactory={selectedFactory}
                onSelectFactory={handleSelectFactory}
                cameraCounts={cameraCounts}
                cameras={cameras}
                onAddCamera={(placeId) => { setAddCameraPlaceId(placeId); setEditCamera(null); setIsModalOpen(true); }}
                onEditCamera={handleEditCamera}
                onDeleteCamera={handleDeleteCamera}
                onAddPlace={() => setIsPlaceModalOpen(true)}
                onDeletePlace={handleDeletePlace}
              />
              <CameraGrid
                cameras={factoryCameras}
                factoryName={selectedFactory?.name}
                isLoading={factoryCamerasLoading}
                onClear={handleClearGrid}
                onFactoryDrop={handleSelectFactory}
              />
            </>
          ) : (
            <SmartAlertsPanel alerts={alerts} />
          )}
        </div>
      )}

      <VoiceAssistantFAB
        isListening={isListening}
        onToggle={handleToggleVoice}
        onCameraFound={(cam) => setViewingCamera(cam)}
        onCamerasChanged={loadCameras}
      />

      {isModalOpen && (
        <AddCameraModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditCamera(null); setAddCameraPlaceId(null); }}
          onAddCamera={handleAddCamera}
          onUpdateCamera={handleUpdateCamera}
          editCamera={editCamera}
          defaultPlaceId={addCameraPlaceId}
        />
      )}

      {isPlaceModalOpen && (
        <AddPlaceModal
          isOpen={isPlaceModalOpen}
          onClose={() => setIsPlaceModalOpen(false)}
          onAddPlace={handleAddPlace}
        />
      )}

      {viewingCamera && (
        <VideoPlayerModal
          camera={viewingCamera}
          onClose={() => setViewingCamera(null)}
          onCameraUpdated={loadCameras}
        />
      )}


      {/* Settings Panel (slide-out) */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
