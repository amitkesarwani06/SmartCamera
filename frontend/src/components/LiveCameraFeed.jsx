import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Camera, Maximize2, Minimize2, Wifi, WifiOff, GripHorizontal, Loader } from 'lucide-react';
import Hls from 'hls.js';


export default function LiveCameraFeed({ camera, onClose }) {
    const videoRef = useRef(null);
    const [videoError, setVideoError] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: camera.x, y: Math.max(camera.y, 8) });
    const dragOffset = useRef({ x: 0, y: 0 });

    // ── Dashboard Snapshot: capture video frame and POST to backend every 30s ──
    const captureAndSendSnapshot = useCallback(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const base64 = canvas.toDataURL('image/jpeg', 0.85);

            fetch(`http://localhost:8000/snapshot/${camera.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            }).catch((err) => console.warn('[Snapshot] Failed to send:', err));
        } catch (err) {
            console.warn('[Snapshot] Canvas capture error:', err);
        }
    }, [camera.id]);

    useEffect(() => {
        // Send an initial snapshot 5s after mount, then every 30s
        const initial = setTimeout(captureAndSendSnapshot, 5000);
        const interval = setInterval(captureAndSendSnapshot, 30000);
        return () => {
            clearTimeout(initial);
            clearInterval(interval);
        };
    }, [captureAndSendSnapshot]);

    const streamUrl = camera.streamUrl;

    // ── URL helpers ──────────────────────────────────────────────────
    const getRtspPath = (url) => {
        if (!url || !url.startsWith('rtsp://')) return null;
        try { return new URL(url).pathname.replace(/^\//, ''); } catch { return null; }
    };

    const getWebRtcUrl = (url) => {
        const path = getRtspPath(url);
        return path ? `http://localhost:8889/${path}/whep` : null;
    };

    const getHlsUrl = (url) => {
        if (!url) return null;
        const path = getRtspPath(url);
        if (path) return `http://localhost:8888/${path}/`;
        
        // Proxy VMS streams through Vite to bypass CORS
        if (url.startsWith('https://vms.cotcorpcontrol.in/')) {
            return url.replace('https://vms.cotcorpcontrol.in', '/vms-proxy');
        }

        if (url.includes('.m3u8') || url.startsWith('http')) return url;
        return null;
    };

    const webrtcUrl = getWebRtcUrl(streamUrl);
    const hlsUrl = getHlsUrl(streamUrl);
    const hasStream = Boolean(webrtcUrl || hlsUrl);

    const [isLoading, setIsLoading] = useState(hasStream);
    const [protocol, setProtocol] = useState(null); // 'webrtc' | 'hls'
    const pcRef = useRef(null);

    // ── WebRTC WHEP (primary, ultra-low latency) ──────────────────────
    const startHls = useCallback(() => {
        if (!hlsUrl || !videoRef.current) { setVideoError(true); return; }
        const video = videoRef.current;

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.play().catch(() => { });
            setIsLoading(false);
            setProtocol('hls');
            return;
        }
        if (!Hls.isSupported()) { setVideoError(true); return; }

        const hls = new Hls({ liveSyncDurationCount: 1, liveMaxLatencyDurationCount: 3 });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            setProtocol('hls');
            video.play().catch(() => { });
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) { setVideoError(true); setIsLoading(false); }
        });
        return () => hls.destroy();
    }, [hlsUrl]);

    useEffect(() => {
        if (!hasStream || !videoRef.current) return;
        const video = videoRef.current;

        // Reset state on stream change
        setVideoError(false);
        setIsLoading(true);
        setProtocol(null);
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

        if (!webrtcUrl) { return startHls(); }

        // Try WebRTC WHEP
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (ev) => {
            if (video.srcObject !== ev.streams[0]) {
                video.srcObject = ev.streams[0];
                video.play().catch(() => { });
                setIsLoading(false);
                setProtocol('webrtc');
            }
        };

        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => fetch(webrtcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription.sdp,
            }))
            .then(res => {
                if (!res.ok) throw new Error(`WHEP ${res.status}`);
                return res.text();
            })
            .then(sdp => pc.setRemoteDescription({ type: 'answer', sdp }))
            .catch(() => {
                // WebRTC failed — fall back to HLS
                pc.close();
                pcRef.current = null;
                startHls();
            });

        return () => { pc.close(); pcRef.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streamUrl]);


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
                    {/* Protocol badge */}
                    {protocol && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${protocol === 'webrtc'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            }`}>
                            {protocol === 'webrtc' ? '⚡ WebRTC' : '📡 HLS'}
                        </span>
                    )}

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
                ) : !hasStream ? (
                    <div className="text-center p-6 z-20">
                        <Camera size={36} className="text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-400 text-xs font-medium">No Stream Configured</p>
                        <p className="text-zinc-600 text-[10px] mt-1">Set a stream URL for this camera in settings</p>
                    </div>
                ) : (
                    <>
                        {isLoading && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
                                <Loader size={28} className="text-emerald-400 animate-spin mb-2" />
                                <p className="text-zinc-400 text-[10px] font-mono">Buffering stream...</p>
                            </div>
                        )}
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    </>
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
                    {hasStream ? (streamUrl?.startsWith('rtsp://') ? '● HLS (via MediaMTX)' : streamUrl) : '● No stream URL set'}
                </span>
                <span className="text-[9px] text-zinc-600 flex-shrink-0">
                    {width}×{height}
                </span>
            </div>
        </div>
    );
}
