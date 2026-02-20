import React, { useRef, useState } from 'react';
import { X, Video, AlertCircle, Edit2, Check, Loader2 } from 'lucide-react';
import { updateCamera } from '../api/client';

export default function VideoPlayerModal({ camera: initialCamera, onClose, onCameraUpdated }) {
    const videoRef = useRef(null);
    const [camera, setCamera] = useState(initialCamera);
    const [editingUrl, setEditingUrl] = useState(false);
    const [urlInput, setUrlInput] = useState(camera?.streamUrl || '');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    if (!camera) return null;

    const streamUrl = camera.streamUrl;
    const isPlayable = streamUrl && !streamUrl.startsWith('rtsp://') && streamUrl !== 'http://example.com/stream';

    const handleSaveUrl = async () => {
        if (!urlInput.trim()) return;
        try {
            setSaving(true);
            setSaveError(null);
            const updated = await updateCamera(camera.id, { streamUrl: urlInput.trim(), status: 'active' });
            setCamera({ ...camera, streamUrl: updated.streamUrl, status: updated.status });
            setEditingUrl(false);
            onCameraUpdated && onCameraUpdated(updated);
        } catch (err) {
            setSaveError('Failed to save URL. Try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-zinc-900 border border-zinc-700 w-full max-w-3xl rounded-xl shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Video size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">{camera.name}</h3>
                            <p className="text-zinc-500 text-xs">{camera.type} • {camera.status === 'active' ? '🟢 Live' : '🔴 Offline'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Video Area */}
                <div className="aspect-video bg-black flex items-center justify-center">
                    {isPlayable ? (
                        <video
                            ref={videoRef}
                            src={streamUrl}
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                            onError={() => { }}
                        >
                            Your browser does not support video playback.
                        </video>
                    ) : (
                        <div className="text-center p-8">
                            <AlertCircle size={48} className="text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-400 text-sm font-medium mb-2">
                                {streamUrl && streamUrl.startsWith('rtsp://')
                                    ? 'RTSP streams cannot play in browser'
                                    : 'No stream URL configured'}
                            </p>
                            <p className="text-zinc-600 text-xs max-w-sm mx-auto mb-6">
                                {streamUrl && streamUrl.startsWith('rtsp://')
                                    ? 'RTSP requires a media server proxy to play in browser.'
                                    : 'Add a video URL below to start watching this camera.'}
                            </p>

                            {/* Inline URL Editor — shown when no URL or RTSP */}
                            {!editingUrl ? (
                                <button
                                    onClick={() => { setEditingUrl(true); setUrlInput(streamUrl || ''); }}
                                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
                                >
                                    <Edit2 size={14} />
                                    {streamUrl ? 'Change Stream URL' : 'Add Stream URL'}
                                </button>
                            ) : (
                                <div className="max-w-md mx-auto space-y-3">
                                    <input
                                        type="text"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveUrl()}
                                        placeholder="https://example.com/stream.mp4"
                                        autoFocus
                                        className="w-full bg-zinc-950 border border-zinc-700 focus:border-blue-500 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-zinc-600 font-mono"
                                    />
                                    {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
                                    <div className="flex gap-2 justify-center">
                                        <button
                                            onClick={() => setEditingUrl(false)}
                                            className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveUrl}
                                            disabled={saving || !urlInput.trim()}
                                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
                                        >
                                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                            {saving ? 'Saving...' : 'Save URL'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-zinc-600 text-xs font-mono truncate">
                            {camera.streamUrl || 'No URL'}
                        </span>
                        {camera.streamUrl && (
                            <button
                                onClick={() => { setEditingUrl(true); setUrlInput(camera.streamUrl); }}
                                className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
                                title="Edit URL"
                            >
                                <Edit2 size={12} />
                            </button>
                        )}
                    </div>
                    <span className="text-zinc-600 text-xs flex-shrink-0">
                        ID: {camera.id?.slice(0, 8)}...
                    </span>
                </div>
            </div>
        </div>
    );
}
