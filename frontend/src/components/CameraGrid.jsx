import React, { useState } from 'react';
import { Grid3X3, LayoutGrid, Monitor, Trash2, Camera, Download } from 'lucide-react';
import CameraCard from './CameraCard';

const GRID_OPTIONS = [
    { key: '2x4', label: '2×4', cols: 4, rows: 2, icon: LayoutGrid },
    { key: '3x3', label: '3×3', cols: 3, rows: 3, icon: Grid3X3 },
    { key: '1x1', label: '1×1', cols: 1, rows: 1, icon: Monitor },
];

export default function CameraGrid({ cameras, factoryName, isLoading, onClear, onFactoryDrop }) {
    const [gridMode, setGridMode] = useState('2x4');
    const [paginationEnabled, setPaginationEnabled] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [isDragOver, setIsDragOver] = useState(false);

    const currentGrid = GRID_OPTIONS.find(g => g.key === gridMode) || GRID_OPTIONS[0];
    const perPage = currentGrid.cols * currentGrid.rows;

    // Pagination
    const totalPages = Math.ceil((cameras?.length || 0) / perPage);
    const displayedCameras = paginationEnabled
        ? (cameras || []).slice(currentPage * perPage, (currentPage + 1) * perPage)
        : (cameras || []).slice(0, perPage);

    // ── Drop zone handlers ──
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        // Only trigger if leaving the main container (not child elements)
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const factoryData = e.dataTransfer.getData('factory');
        if (factoryData && onFactoryDrop) {
            try {
                const factory = JSON.parse(factoryData);
                onFactoryDrop(factory);
            } catch (err) {
                console.error('Failed to parse factory data on drop', err);
            }
        }
    };

    // ── Empty state (drop zone) ──
    if (!cameras || cameras.length === 0) {
        return (
            <main
                className={`flex-1 bg-zinc-950 flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
                    isDragOver ? 'ring-2 ring-inset ring-blue-500/50 bg-blue-950/10' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Grid background */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(#4f4f4f 1px, transparent 1px), linear-gradient(90deg, #4f4f4f 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />

                {/* Drop highlight overlay */}
                {isDragOver && (
                    <div className="absolute inset-0 bg-blue-500/5 pointer-events-none z-0 transition-opacity">
                        <div className="absolute inset-4 border-2 border-dashed border-blue-500/40 rounded-2xl flex items-center justify-center">
                            <div className="text-center">
                                <Download size={48} className="mx-auto mb-4 text-blue-400 animate-bounce" />
                                <p className="text-blue-300 text-lg font-semibold">Drop Factory Here</p>
                                <p className="text-blue-400/60 text-sm mt-1">Release to load 8 camera feeds</p>
                            </div>
                        </div>
                    </div>
                )}

                {!isDragOver && (
                    <div className="text-center relative z-10">
                        <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-5 border border-zinc-700/50">
                            <Camera size={32} className="text-zinc-600" />
                        </div>
                        <p className="text-zinc-400 text-lg font-semibold mb-2">Drag a Factory Here</p>
                        <p className="text-zinc-600 text-sm max-w-xs">
                            Drag a factory from the sidebar and drop it here to load all 8 camera feeds into the grid.
                        </p>
                        <p className="text-zinc-700 text-xs mt-3">or click a factory to select it</p>
                    </div>
                )}
            </main>
        );
    }

    return (
        <main
            className={`flex-1 bg-zinc-950 flex flex-col overflow-hidden relative transition-all duration-300 ${
                isDragOver ? 'ring-2 ring-inset ring-blue-500/50' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Grid background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#4f4f4f 1px, transparent 1px), linear-gradient(90deg, #4f4f4f 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Drop overlay when grid already has content */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <Download size={48} className="mx-auto mb-4 text-blue-400 animate-bounce" />
                        <p className="text-blue-300 text-lg font-semibold">Replace with New Factory</p>
                        <p className="text-blue-400/60 text-sm mt-1">Drop to replace current camera feeds</p>
                    </div>
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    {/* Grid selector */}
                    <div className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700/50 overflow-hidden">
                        {GRID_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.key}
                                    onClick={() => { setGridMode(opt.key); setCurrentPage(0); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                                        gridMode === opt.key
                                            ? 'bg-blue-600 text-white'
                                            : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                                    }`}
                                    title={`${opt.label} Grid`}
                                >
                                    <Icon size={13} />
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Clear */}
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium rounded-lg transition-all border border-red-500/20 hover:border-red-500/40"
                        >
                            <Trash2 size={12} />
                            Clear
                        </button>
                    )}

                    {/* Factory name badge */}
                    {factoryName && (
                        <span className="text-xs font-medium text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                            📹 {factoryName}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Pagination toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs">Pagination</span>
                        <button
                            onClick={() => { setPaginationEnabled(!paginationEnabled); setCurrentPage(0); }}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                                paginationEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                            }`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                                paginationEnabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`} />
                        </button>
                    </div>

                    {/* Camera count */}
                    <span className="text-zinc-500 text-xs font-mono">
                        {displayedCameras.length} / {cameras.length} cameras
                    </span>
                </div>
            </div>

            {/* ── Loading State ── */}
            {isLoading && (
                <div className="flex-1 flex items-center justify-center relative z-10">
                    <div className="text-center">
                        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-zinc-400 text-sm">Loading cameras...</p>
                    </div>
                </div>
            )}

            {/* ── Camera Grid ── */}
            {!isLoading && (
                <div className="flex-1 p-4 overflow-auto relative z-10">
                    <div
                        className="grid gap-3 h-full"
                        style={{
                            gridTemplateColumns: `repeat(${currentGrid.cols}, 1fr)`,
                            gridTemplateRows: `repeat(${currentGrid.rows}, 1fr)`,
                        }}
                    >
                        {displayedCameras.map((cam) => (
                            <CameraCard key={cam.id} camera={cam} />
                        ))}

                        {/* Fill empty slots with placeholder */}
                        {displayedCameras.length < perPage &&
                            Array.from({ length: perPage - displayedCameras.length }).map((_, i) => (
                                <div
                                    key={`empty-${i}`}
                                    className="bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center"
                                >
                                    <p className="text-zinc-700 text-sm">Drop Here</p>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {/* ── Pagination Controls ── */}
            {paginationEnabled && totalPages > 1 && !isLoading && (
                <div className="relative z-10 flex items-center justify-center gap-3 py-3 border-t border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
                    >
                        ← Previous
                    </button>
                    <span className="text-zinc-500 text-xs font-mono">
                        Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
                    >
                        Next →
                    </button>
                </div>
            )}
        </main>
    );
}
