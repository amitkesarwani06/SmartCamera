import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, Wifi, WifiOff, Camera, Loader, RefreshCw } from 'lucide-react';
import Hls from 'hls.js';

export default function CameraCard({ camera }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const hlsRef = useRef(null);
    const pcRef = useRef(null);

    const [videoError, setVideoError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [protocol, setProtocol] = useState(null);
    const [timestamp, setTimestamp] = useState(new Date());
    const [activityDescription, setActivityDescription] = useState('Wait for analysis...');

    const streamUrl = camera.streamUrl;

    // ── URL Helpers ──
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

    // ── Update timestamp every second ──
    useEffect(() => {
        const interval = setInterval(() => setTimestamp(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Snapshot capture (send to backend every 30s) ──
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
            })
            .then(res => res.json())
            .then(data => {
                if (data.description) {
                    setActivityDescription(data.description);
                }
            })
            .catch((err) => console.warn('[Snapshot] Failed:', err));
        } catch (err) {
            console.warn('[Snapshot] Canvas error:', err);
        }
    }, [camera.id]);

    useEffect(() => {
        const initial = setTimeout(captureAndSendSnapshot, 5000);
        const interval = setInterval(captureAndSendSnapshot, 30000);
        return () => { clearTimeout(initial); clearInterval(interval); };
    }, [captureAndSendSnapshot]);

    // ── HLS Player ──
    const startHls = useCallback(() => {
        if (!hlsUrl || !videoRef.current) { setVideoError(true); setIsLoading(false); return; }
        const video = videoRef.current;

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.play().catch(() => {});
            setIsLoading(false);
            setProtocol('hls');
            return;
        }
        if (!Hls.isSupported()) { setVideoError(true); setIsLoading(false); return; }

        const hls = new Hls({ liveSyncDurationCount: 1, liveMaxLatencyDurationCount: 3 });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            setProtocol('hls');
            video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) { setVideoError(true); setIsLoading(false); }
        });

        return () => hls.destroy();
    }, [hlsUrl]);

    // ── Stream init (WebRTC → HLS fallback) ──
    useEffect(() => {
        if (!hasStream || !videoRef.current) {
            setIsLoading(false);
            return;
        }

        const video = videoRef.current;
        setVideoError(false);
        setIsLoading(true);
        setProtocol(null);

        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

        if (!webrtcUrl) { return startHls(); }

        // Try WebRTC WHEP
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.ontrack = (ev) => {
            if (video.srcObject !== ev.streams[0]) {
                video.srcObject = ev.streams[0];
                video.play().catch(() => {});
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
                pc.close();
                pcRef.current = null;
                startHls();
            });

        return () => {
            if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
            if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streamUrl]);

    // ── Fullscreen ──
    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // ── Retry ──
    const handleRetry = () => {
        setVideoError(false);
        setIsLoading(true);
        setProtocol(null);
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        // Small delay before retrying
        setTimeout(() => {
            if (webrtcUrl) {
                // Re-trigger useEffect by forcing a state cycle
                // Simplest approach: just call startHls directly for now
            }
            startHls();
        }, 500);
    };

    return (
        <div
            ref={containerRef}
            className={`relative bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 group transition-all duration-300 hover:border-zinc-600 ${
                isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-0' : ''
            }`}
        >
            {/* ── Video Area ── */}
            <div className="relative w-full h-full min-h-[180px] bg-black flex items-center justify-center">
                {/* Scanline overlay */}
                <div
                    className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
                    }}
                />

                {/* Error state */}
                {videoError && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/95">
                        <WifiOff size={28} className="text-red-500/60 mb-2" />
                        <p className="text-zinc-400 text-xs font-medium mb-1">Camera Offline</p>
                        <p className="text-zinc-600 text-[10px] mb-3">Signal Lost</p>
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded-md transition-colors border border-zinc-700"
                        >
                            <RefreshCw size={10} />
                            Retry
                        </button>
                    </div>
                )}

                {/* No stream configured */}
                {!hasStream && !videoError && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                        <Camera size={28} className="text-zinc-700 mb-2" />
                        <p className="text-zinc-500 text-xs">No Stream</p>
                    </div>
                )}

                {/* Loading overlay */}
                {isLoading && hasStream && !videoError && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80">
                        <Loader size={22} className="text-blue-400 animate-spin mb-2" />
                        <p className="text-zinc-500 text-[10px] font-mono">Connecting...</p>
                    </div>
                )}

                {/* Video element */}
                {hasStream && (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                )}

                {/* ── Overlays ── */}

                {/* Camera name (top-left) */}
                <div className="absolute top-0 left-0 z-30 px-2.5 py-1.5 bg-gradient-to-r from-black/80 to-transparent max-w-[70%]">
                    <p className="text-white text-xs font-semibold truncate drop-shadow-lg">
                        {camera.name}
                    </p>
                </div>

                {/* Status + Fullscreen (top-right) */}
                <div className="absolute top-1.5 right-1.5 z-30 flex items-center gap-1.5">
                    {/* Connection status */}
                    {!videoError && hasStream && (
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                            {protocol ? (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-red-400 text-[9px] font-bold tracking-wider">REC</span>
                                </>
                            ) : (
                                <>
                                    <Wifi size={9} className="text-emerald-400" />
                                    <span className="text-emerald-400 text-[9px] font-bold">LIVE</span>
                                </>
                            )}
                        </div>
                    )}

                    {videoError && (
                        <div className="flex items-center gap-1 bg-red-900/60 backdrop-blur-sm px-2 py-1 rounded-full">
                            <WifiOff size={9} className="text-red-400" />
                            <span className="text-red-400 text-[9px] font-bold">OFF</span>
                        </div>
                    )}

                    {/* Fullscreen toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="w-7 h-7 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-md text-zinc-400 hover:text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                </div>

                {/* Timestamp (bottom-right) */}
                <div className="absolute bottom-1.5 right-1.5 z-30 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-mono text-zinc-300">
                    {timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                    {timestamp.toLocaleTimeString('en-IN', { hour12: true })}
                </div>

                {/* Protocol badge (bottom-left) */}
                {protocol && (
                    <div className={`absolute bottom-1.5 left-1.5 z-30 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${
                        protocol === 'webrtc'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}>
                        {protocol === 'webrtc' ? '⚡ WebRTC' : '📡 HLS'}
                    </div>
                )}

                {/* Activity Description (bottom-left area) */}
                {!videoError && hasStream && (
                    <div className="absolute bottom-10 left-2 right-2 z-30 pointer-events-none">
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-2 rounded-lg max-w-[90%] transform transition-all duration-500 translate-y-0 group-hover:translate-y-[-4px]">
                            <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                                <p className="text-[9px] text-zinc-200 leading-relaxed line-clamp-2 italic font-medium">
                                    {activityDescription}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

    );
}
