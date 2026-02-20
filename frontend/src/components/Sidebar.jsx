import React from 'react';
import { Camera, Plus, GripVertical, Trash2 } from 'lucide-react';

export default function Sidebar({ cameras, onDragStart, onAddCamera, onDeleteCamera }) {
    return (
        <aside className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-zinc-800">
                <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4 px-1">Camera Assets</h2>
                <button
                    onClick={onAddCamera}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-2 transition-all font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 text-sm active:scale-[0.98]"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    Add New Camera
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cameras.map((camera) => (
                    <div
                        key={camera.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, camera)}
                        className="group p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:bg-zinc-800 hover:border-blue-500/50 cursor-grab active:cursor-grabbing flex items-center gap-3 transition-all relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                            <GripVertical size={16} />
                        </div>

                        <div className="p-2 bg-zinc-900 rounded-md text-zinc-400 group-hover:text-blue-400 transition-colors shadow-inner">
                            <Camera size={20} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-zinc-200 text-sm truncate group-hover:text-white transition-colors">{camera.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{camera.type}</p>
                        </div>

                        {/* Delete button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (confirm(`Delete "${camera.name}"?`)) {
                                    onDeleteCamera(camera.id);
                                }
                            }}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100 z-10 relative"
                            title="Delete camera"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                {cameras.length === 0 && (
                    <div className="text-center py-8 px-4 opacity-50">
                        <p className="text-zinc-500 text-sm">No cameras available. Add one to get started.</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-zinc-900/50 text-center border-t border-zinc-800">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">System v1.0.4</p>
            </div>
        </aside>
    );
}
