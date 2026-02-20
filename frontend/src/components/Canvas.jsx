import React from 'react';
import { Camera, MapPin, X } from 'lucide-react';

export default function Canvas({ placedCameras, onDrop, onDragOver, onRemoveCamera, onViewCamera }) {

    return (
        <main
            className="flex-1 bg-zinc-950 relative overflow-hidden select-none"
            onDrop={onDrop}
            onDragOver={onDragOver}
        >
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#4f4f4f 1px, transparent 1px), linear-gradient(90deg, #4f4f4f 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Blueprint lines logic could be added here for realism */}

            {/* Empty State / Instructional Text */}
            {placedCameras.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <div className="text-center">
                        <MapPin size={48} className="mx-auto mb-4 text-zinc-500" />
                        <p className="text-zinc-400 text-2xl font-bold tracking-tight uppercase">Floor Plan View</p>
                        <p className="text-zinc-500 text-sm mt-2 font-mono">Drag cameras from inventory to deploy</p>
                    </div>
                </div>
            )}

            {/* Placed Cameras */}
            {placedCameras.map((cam) => (
                <div
                    key={cam.instanceId}
                    style={{
                        position: 'absolute',
                        left: cam.x,
                        top: cam.y,
                        transform: 'translate(-50%, -50%)', // Center the icon on the drop point
                        zIndex: 10
                    }}
                    className="group cursor-pointer"
                    title={`${cam.name} (${cam.type}) — Click to view`}
                    onClick={() => onViewCamera && onViewCamera(cam)}
                >
                    {/* Simulated Vision Cone */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 origin-top w-24 h-32 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm"
                        style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', transform: 'rotate(180deg) translateX(50%)' }} />

                    {/* Camera Icon */}
                    <div className={`p-2.5 rounded-full shadow-lg transition-transform hover:scale-110 relative z-20 ring-2 ring-black/50 ${cam.type.includes('Dome') ? 'bg-blue-600 text-white shadow-blue-500/30' :
                        cam.type.includes('Bullet') ? 'bg-emerald-600 text-white shadow-emerald-500/30' :
                            'bg-orange-600 text-white shadow-orange-500/30'
                        }`}>
                        <Camera size={20} />
                    </div>

                    {/* Hover Detail Card */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-zinc-900/90 backdrop-blur border border-zinc-700 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 shadow-xl translate-y-2 group-hover:translate-y-0">
                        <p className="font-bold text-white">{cam.name}</p>
                        <p className="text-zinc-400 text-[10px] uppercase">{cam.type}</p>
                        <div className="mt-1 flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-emerald-500">Live</span>
                        </div>
                    </div>

                    {/* Remove Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCamera(cam.id);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-30 cursor-pointer"
                        title="Remove Camera"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </main>
    );
}
