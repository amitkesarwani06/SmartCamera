import React, { useState, useMemo } from 'react';
import { Factory, Search, ChevronDown, ChevronRight, GripVertical, Camera, Plus, Pencil, Trash2 } from 'lucide-react';

export default function FactorySidebar({
    factories,
    selectedFactory,
    onSelectFactory,
    cameraCounts,
    cameras,
    onAddCamera,
    onEditCamera,
    onDeleteCamera,
    onAddPlace,
    onDeletePlace,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [draggingId, setDraggingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const ITEMS_PER_PAGE = 15;

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return factories;
        const q = searchQuery.toLowerCase();
        return factories.filter(f => f.name?.toLowerCase().includes(q));
    }, [factories, searchQuery]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    // Get cameras for a specific factory
    const getCamerasForFactory = (factoryId) => {
        return (cameras || []).filter(c => c.placeId === factoryId);
    };

    const handleDragStart = (e, factory) => {
        e.dataTransfer.setData('factory', JSON.stringify(factory));
        e.dataTransfer.effectAllowed = 'copy';
        setDraggingId(factory.id);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
    };

    const handleFactoryClick = (factory) => {
        onSelectFactory(factory);
        setExpandedId(prev => prev === factory.id ? null : factory.id);
    };

    return (
        <aside className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Factory size={12} />
                        Factories
                    </h2>
                    <button
                        onClick={onAddPlace}
                        className="p-1.5 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Add New Factory"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                        placeholder="Search Cameras..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                </div>
            </div>

            {/* Factory List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 cctv-scrollbar">
                {paginated.map((factory) => {
                    const isSelected = selectedFactory?.id === factory.id;
                    const isDragging = draggingId === factory.id;
                    const isExpanded = expandedId === factory.id;
                    const counts = cameraCounts?.[factory.id] || { online: 0, total: 0 };
                    const factoryCams = getCamerasForFactory(factory.id);

                    return (
                        <div key={factory.id} className="space-y-0.5">
                            {/* Factory Row */}
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, factory)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleFactoryClick(factory)}
                                className={`w-full text-left p-3 rounded-lg transition-all duration-200 group relative overflow-hidden cursor-grab active:cursor-grabbing select-none ${
                                    isDragging
                                        ? 'opacity-50 scale-95 border border-blue-500/50 bg-blue-600/10'
                                        : isSelected
                                            ? 'bg-blue-600/10 border border-blue-500/30'
                                            : 'bg-zinc-800/30 border border-transparent hover:bg-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                {isSelected && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
                                )}

                                <div className="flex items-center gap-2 relative z-10">
                                    <GripVertical size={14} className="text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />

                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        counts.online > 0 || counts.total > 0 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                                    }`} />

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${
                                            isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                                        } transition-colors`}>
                                            {factory.name}
                                        </p>
                                    </div>

                                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${
                                        isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-700/50 text-zinc-400'
                                    }`}>
                                        {counts.online} / {counts.total}
                                    </span>

                                    {/* Delete Factory Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete factory "${factory.name}" and all its camera references?`)) {
                                                onDeletePlace?.(factory.id);
                                            }
                                        }}
                                        className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100 mx-1"
                                        title="Delete Factory"
                                    >
                                        <Trash2 size={13} />
                                    </button>

                                    {isExpanded
                                        ? <ChevronDown size={14} className="text-blue-400 flex-shrink-0" />
                                        : <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                                    }
                                </div>
                            </div>

                            {/* Expanded Camera List */}
                            {isExpanded && (
                                <div className="ml-4 pl-3 border-l-2 border-zinc-800 space-y-1 py-1">
                                    {factoryCams.length > 0 ? (
                                        factoryCams.map((cam) => (
                                            <div
                                                key={cam.id}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800/60 group/cam transition-colors"
                                            >
                                                <Camera size={12} className="text-zinc-500 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-zinc-300 truncate">{cam.name}</p>
                                                    <p className="text-[10px] text-zinc-600 truncate font-mono">{cam.streamUrl || 'No URL'}</p>
                                                </div>

                                                {/* Edit button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEditCamera?.(cam); }}
                                                    className="p-1 text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all opacity-0 group-hover/cam:opacity-100"
                                                    title="Edit camera"
                                                >
                                                    <Pencil size={11} />
                                                </button>

                                                {/* Delete button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Delete "${cam.name}"?`)) {
                                                            onDeleteCamera?.(cam.id);
                                                        }
                                                    }}
                                                    className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover/cam:opacity-100"
                                                    title="Delete camera"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-zinc-600 px-2 py-1">No cameras in this factory</p>
                                    )}

                                    {/* Add Camera button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAddCamera?.(factory.id); }}
                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-md transition-all font-medium"
                                    >
                                        <Plus size={12} />
                                        Add Camera
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <Factory size={32} className="mx-auto mb-3 text-zinc-600" />
                        <p className="text-zinc-500 text-sm">No factories found</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-3 border-t border-zinc-800 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-zinc-800 transition-all"
                    >
                        ← Prev
                    </button>
                    <span className="text-xs text-zinc-500 font-mono">
                        {currentPage + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-zinc-800 transition-all"
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Footer */}
            <div className="p-3 bg-zinc-900/50 text-center border-t border-zinc-800">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                    {factories.length} Factories • Drag to Grid
                </p>
            </div>
        </aside>
    );
}
