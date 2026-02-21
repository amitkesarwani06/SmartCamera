import React, { useRef, useState } from 'react';
import { X, Camera, Maximize2, Minimize2, Wifi, WifiOff, GripHorizontal } from 'lucide-react';

const PLACEHOLDER_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export default function LiveCameraFeed({ camera, onClose }) {
    const videoRef = useRef(null);
    const [videoError, setVideoError] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: camera.x, y: Math.max(camera.y, 8) });
    const dragOffset = useRef({ x: 0, y: 0 });

    const streamUrl = camera.streamUrl;
    const isPlayable =
        streamUrl &&
        !streamUrl.startsWith('rtsp://') &&
        streamUrl !== 'http://example.com/stream';

    const effectiveUrl = isPlayable ? streamUrl : PLACEHOLDER_VIDEO;

    const handleHeaderMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        setIsDragging(true);

        const onMouseMove = (ev) => {
            setPos({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
        };
        const onMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const typeColor = camera.type?.includes('Dome')
        ? { ring: 'ring-blue-500/50', dot: 'bg-blue-500', label: 'text-blue-400' }
        : camera.type?.includes('Bullet')
            ? { ring: 'ring-emerald-500/50', dot: 'bg-emerald-500', label: 'text-emerald-400' }
            : { ring: 'ring-orange-500/50', dot: 'bg-orange-500', label: 'text-orange-400' };

    const width = isExpanded ? 640 : 400;
    const height = isExpanded ? 480 : 300;

    return (
        <div
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, 0)',
                width,
                zIndex: 50,
                cursor: isDragging ? 'grabbing' : 'default',
            }}
            className={`bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden
                        flex flex-col ring-1 ${typeColor.ring}`}
        >
            {/* ── Header ── */}
            <div
                onMouseDown={handleHeaderMouseDown}
                className="flex items-center justify-between px-3 py-2 bg-zinc-800
                           border-b border-zinc-700 select-none cursor-grab active:cursor-grabbing"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <GripHorizontal size={14} className="text-zinc-500 flex-shrink-0" />
                    <div className="p-1 rounded-md bg-zinc-700">
                        <Camera size={13} className={typeColor.label} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-semibold text-xs truncate leading-none">{camera.name}</p>
                        <p className={`text-[10px] ${typeColor.label} truncate`}>{camera.type}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {/* Live badge */}
                    <div className="flex items-center gap-1 bg-zinc-900/60 px-2 py-0.5 rounded-full">
                        {videoError
                            ? <WifiOff size={10} className="text-red-400" />
                            : <Wifi size={10} className="text-emerald-400" />}
                        <span className={`text-[9px] font-bold ${videoError ? 'text-red-400' : 'text-emerald-400'}`}>
                            {videoError ? 'OFFLINE' : 'LIVE'}
                        </span>
                        {!videoError && <span className={`w-1.5 h-1.5 rounded-full ${typeColor.dot} animate-pulse`} />}
                    </div>

                    {/* Expand */}
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => setIsExpanded(v => !v)}
                        title={isExpanded ? 'Shrink' : 'Expand'}
                        className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                        {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>


                </div>
            </div>

            {/* ── Video Area ── */}
            <div
                className="bg-black flex items-center justify-center relative"
                style={{ height }}
            >
                {/* Scanlines */}
                <div
                    className="absolute inset-0 pointer-events-none z-10 opacity-5"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
                    }}
                />

                {videoError ? (
                    <div className="text-center p-6 z-20">
                        <WifiOff size={36} className="text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400 text-xs font-medium">Feed Unavailable</p>
                        <p className="text-zinc-600 text-[10px] mt-1">Check stream URL or network</p>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        src={effectiveUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                        onError={() => setVideoError(true)}
                    />
                )}

                {/* ── PROMINENT CLOSE BUTTON — always visible inside video ── */}
                <button
                    onClick={onClose}
                    title="Remove feed"
                    className="absolute top-2 right-2 z-50
                               w-8 h-8 flex items-center justify-center
                               rounded-full bg-red-600 hover:bg-red-500
                               text-white shadow-xl border-2 border-white/20
                               transition-all hover:scale-110 active:scale-95"
                >
                    <X size={15} strokeWidth={3} />
                </button>

                {/* Timestamp */}
                <div className="absolute bottom-2 right-2 z-20 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400">
                    {new Date().toLocaleTimeString()}
                </div>

                {/* Camera ID watermark */}
                <div className="absolute top-2 left-2 z-20 text-[9px] font-mono text-zinc-600 select-none">
                    CAM #{camera.id?.slice(0, 6).toUpperCase()}
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-3 py-1.5 bg-zinc-800/50 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-[9px] font-mono text-zinc-600 truncate max-w-[70%]">
                    {isPlayable ? streamUrl : '● Placeholder stream (no URL set)'}
                </span>
                <span className="text-[9px] text-zinc-600 flex-shrink-0">
                    {width}×{height}
                </span>
            </div>
        </div>
    );
}
