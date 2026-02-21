import React from 'react';
import { MapPin } from 'lucide-react';
import LiveCameraFeed from './LiveCameraFeed';

export default function Canvas({ placedCameras, onDrop, onDragOver, onRemoveCamera }) {

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

            {/* Empty State */}
            {placedCameras.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <div className="text-center">
                        <MapPin size={48} className="mx-auto mb-4 text-zinc-500" />
                        <p className="text-zinc-400 text-2xl font-bold tracking-tight uppercase">Floor Plan View</p>
                        <p className="text-zinc-500 text-sm mt-2 font-mono">Drag cameras from inventory to deploy</p>
                    </div>
                </div>
            )}

            {/* Live Camera Feed Windows */}
            {placedCameras.map((cam) => (
                <LiveCameraFeed
                    key={cam.instanceId}
                    camera={cam}
                    onClose={() => onRemoveCamera(cam.instanceId)}
                />
            ))}
        </main>
    );
}
