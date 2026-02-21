import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { processVoiceCommand } from '../api/client';

// ─── Silence detection config ─────────────────────────────────────────────────
const SILENCE_THRESHOLD = 15;       // RMS below this = silence (0-128 scale)
const SILENCE_DURATION_MS = 2000;   // auto-stop after 2 s of silence
const MIN_RECORD_MS = 500;          // always record at least 0.5 s
// ──────────────────────────────────────────────────────────────────────────────

function getResponseMessage(result) {
    if (!result) return null;
    const execution = result.execution;
    const command = result.command;
    if (!execution) return 'Command processed, but no result received.';
    if (!execution.success) return `Sorry, ${execution.error || 'something went wrong.'}`;
    const action = command?.action;
    switch (action) {
        case 'show_camera': {
            if (execution.type === 'camera_list') {
                const cams = execution.cameras;
                return `You have ${cams?.length || 'multiple'} cameras: ${cams?.map(c => c.name).join(', ')}. Say a specific name.`;
            }
            const cam = execution.data;
            if (cam) return `Opening "${cam.name}". It is a ${cam.type}, currently ${cam.status}.`;
            return 'Camera found and displayed.';
        }
        case 'show_place': {
            const place = execution.place; const cams = execution.cameras;
            if (place && cams) return `Found ${cams.length} camera${cams.length !== 1 ? 's' : ''} at "${place.name}": ${cams.map(c => c.name).join(', ')}.`;
            return 'Place cameras displayed.';
        }
        case 'add_place': return `Place "${execution.data?.name || 'unknown'}" created.`;
        case 'add_camera': return `Camera "${execution.data?.name || 'unknown'}" added.`;
        case 'analyze_camera':
        case 'describe_scene': return execution.description || execution.analysis || execution.result || 'Scene analyzed.';
        case 'detect_person': return execution.result || 'Person detection completed.';
        case 'detect_motion': return execution.result || 'Motion detection completed.';
        case 'count_objects': return execution.result || 'Object counting completed.';
        default:
            return execution.message || (execution.result ? String(execution.result) : 'Command executed.');
    }
}

function speak(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
        || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
}

export default function VoiceAssistantFAB({ onToggle, onCameraFound, onCamerasChanged }) {
    const [recording, setRecording] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState(null);
    const [transcript, setTranscript] = useState(null);
    const [error, setError] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [silenceCountdown, setSilenceCountdown] = useState(null); // seconds left before stop

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioCtxRef = useRef(null);
    const rafRef = useRef(null);
    const recordStartRef = useRef(0);
    const streamRef = useRef(null);

    useEffect(() => { window.speechSynthesis?.getVoices(); }, []);
    useEffect(() => () => { stopAll(); window.speechSynthesis?.cancel(); }, []);

    // ── Stop everything ──────────────────────────────────────────────────────
    const stopAll = () => {
        cancelAnimationFrame(rafRef.current);
        audioCtxRef.current?.close().catch(() => { });
        audioCtxRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setSilenceCountdown(null);
    };

    // ── Silence detection ────────────────────────────────────────────────────
    const startSilenceDetection = (stream, onSilenceStop) => {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        let silenceStart = null;

        const tick = () => {
            if (!mediaRecorderRef.current) return;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) { const v = data[i] - 128; sum += v * v; }
            const rms = Math.sqrt(sum / data.length);
            const elapsed = Date.now() - recordStartRef.current;

            if (rms < SILENCE_THRESHOLD && elapsed > MIN_RECORD_MS) {
                if (!silenceStart) silenceStart = Date.now();
                const gone = Date.now() - silenceStart;
                const remaining = Math.max(0, Math.ceil((SILENCE_DURATION_MS - gone) / 1000));
                setSilenceCountdown(remaining);
                if (gone >= SILENCE_DURATION_MS) { onSilenceStop(); return; }
            } else {
                silenceStart = null;
                setSilenceCountdown(null);
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    };

    // ── Start recording ──────────────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            audioChunksRef.current = [];
            recordStartRef.current = Date.now();

            mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

            mr.onstop = async () => {
                stopAll();
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                mediaRecorderRef.current = null;
                setRecording(false);
                await sendAudio(blob);
            };

            mr.start(100);
            setRecording(true);
            setError(null); setMessage(null); setTranscript(null);
            setShowPopup(false);

            startSilenceDetection(stream, () => {
                if (mediaRecorderRef.current?.state !== 'inactive') {
                    mediaRecorderRef.current?.stop();
                }
            });

        } catch (err) {
            console.error('Mic error:', err);
            setError('Microphone access denied. Click the lock icon in your browser address bar to allow it.');
            setShowPopup(true);
        }
    };

    // ── Stop recording manually ──────────────────────────────────────────────
    const stopRecording = () => {
        cancelAnimationFrame(rafRef.current);
        setSilenceCountdown(null);
        if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current?.stop();
        } else {
            setRecording(false);
            stopAll();
        }
    };

    // ── Send audio → backend /voice ──────────────────────────────────────────
    const sendAudio = async (blob) => {
        setProcessing(true);
        setShowPopup(true);
        try {
            const data = await processVoiceCommand(blob);

            const msg = getResponseMessage(data);
            setTranscript(data.spoken_text || null);
            setMessage(msg);
            setError(null);
            if (msg) speak(msg);

            const ex = data.execution;
            if (ex?.success && ex?.type === 'camera' && ex?.data) onCameraFound?.(ex.data);
            if (ex?.success && (ex?.type === 'camera_created' || ex?.type === 'place_created')) onCamerasChanged?.();
        } catch (err) {
            console.error(err);
            setError('Could not reach backend. Make sure it is running on port 8000.');
        } finally {
            setProcessing(false);
        }
    };

    const handleToggle = () => {
        if (recording) stopRecording();
        else startRecording();
        onToggle?.();
    };

    const dismissPopup = () => {
        setShowPopup(false); setMessage(null); setTranscript(null); setError(null);
        window.speechSynthesis?.cancel();
    };

    const silenceFill = silenceCountdown !== null
        ? Math.round(((SILENCE_DURATION_MS / 1000 - silenceCountdown) / (SILENCE_DURATION_MS / 1000)) * 100)
        : 0;

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">

            {/* Response popup */}
            {showPopup && (message || error || processing) && (
                <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 p-4 rounded-xl shadow-2xl max-w-sm relative">
                    {!processing && (
                        <button onClick={dismissPopup} className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300 p-1 rounded">
                            <X size={14} />
                        </button>
                    )}
                    {processing && (
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400" />
                            <span className="text-zinc-300 text-sm">Processing your command...</span>
                        </div>
                    )}
                    {error && !processing && (
                        <div className="text-red-400 text-sm">
                            <p className="font-semibold mb-1">⚠️ Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {message && !processing && !error && (
                        <div className="space-y-3 pr-4">
                            {transcript && (
                                <div>
                                    <p className="text-zinc-500 text-xs font-semibold uppercase mb-1">🎤 You said</p>
                                    <p className="text-zinc-300 text-sm italic">"{transcript}"</p>
                                </div>
                            )}
                            <div>
                                <p className="text-zinc-500 text-xs font-semibold uppercase mb-1">
                                    <Volume2 size={12} className="inline mr-1" />Assistant
                                </p>
                                <p className="text-white text-sm leading-relaxed">{message}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recording indicator */}
            {recording && (
                <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700 px-4 py-3 rounded-xl shadow-2xl min-w-[220px]">
                    <div className="flex items-center gap-2.5 mb-2">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                        <span className="font-semibold text-white text-sm tracking-wide">Recording...</span>
                    </div>
                    {silenceCountdown !== null ? (
                        <div className="space-y-1.5">
                            <p className="text-amber-400 text-xs">
                                🤫 Stopping in <strong>{silenceCountdown}s</strong>...
                            </p>
                            <div className="w-full bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                                <div className="h-1.5 rounded-full bg-amber-400 transition-all duration-300"
                                    style={{ width: `${silenceFill}%` }} />
                            </div>
                        </div>
                    ) : (
                        <p className="text-zinc-400 text-xs italic">Speak clearly — stops automatically</p>
                    )}
                </div>
            )}

            {/* FAB button */}
            <button
                onClick={handleToggle}
                disabled={processing}
                aria-label="Voice Command"
                title={recording ? 'Click to stop' : 'Click to speak a command'}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 border focus:outline-none
                    ${recording
                        ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-red-500/40 ring-2 ring-red-500/50'
                        : processing
                            ? 'bg-zinc-700 border-zinc-600 text-zinc-500 cursor-not-allowed'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 hover:scale-110'
                    }`}
            >
                {recording ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
        </div>
    );
}
