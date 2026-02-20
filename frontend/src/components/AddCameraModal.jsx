import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddCameraModal({ isOpen, onClose, onAddCamera }) {
    if (!isOpen) return null;

    const [name, setName] = useState('');
    const [type, setType] = useState('Dome Camera');
    const [streamUrl, setStreamUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        onAddCamera({
            name: name.trim(),
            streamUrl: streamUrl.trim() || 'http://example.com/stream',
            type: type,
            status: 'active',
            placeId: null  // Can be extended to support place selection
        });

        setName('');
        setType('Dome Camera');
        setStreamUrl('');
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors p-1 hover:bg-zinc-800 rounded-lg"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-1">Add New Camera</h2>
                <p className="text-zinc-500 text-sm mb-6">Configure the camera details below.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Camera Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none placeholder-zinc-700 transition-all font-medium"
                            placeholder="e.g. North Hallway Cam"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Stream URL</label>
                        <input
                            type="text"
                            value={streamUrl}
                            onChange={(e) => setStreamUrl(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none placeholder-zinc-700 transition-all font-medium"
                            placeholder="e.g. http://camera-ip:port/stream (optional)"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Camera Type</label>
                        <div className="relative">
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none appearance-none transition-all font-medium cursor-pointer"
                            >
                                <option value="Dome Camera">Dome Camera (360° View)</option>
                                <option value="Bullet Camera">Bullet Camera (Long Range)</option>
                                <option value="PTZ Camera">PTZ Camera (Zoom/Tilt)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-sm"
                        >
                            Add Camera
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
