import React from 'react';
import { Shield, Clock, AlertTriangle, CheckCircle, Search, Info } from 'lucide-react';

export default function SmartAlertsPanel({ alerts }) {
    return (
        <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
                        <Shield className="text-blue-400" size={20} />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-lg">Smart Intelligence Alerts</h2>
                        <p className="text-zinc-500 text-xs">VLM-powered behavioral reasoning and threat analysis</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 mr-2">Sort by: Newest</span>
                    <div className="px-3 py-1.5 bg-zinc-800 rounded-lg text-xs text-zinc-400 border border-zinc-700">
                        Today
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 cctv-scrollbar">
                {alerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <Search size={48} className="text-zinc-800 mb-4" />
                        <p className="text-zinc-400 font-medium">No alerts detected yet</p>
                        <p className="text-zinc-600 text-sm">System is actively monitoring for suspicious activities.</p>
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const isHighRisk = alert.severity === 'critical' || alert.message.toLowerCase().includes('alert detected');
                        const time = new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        // Parse reasoning if it follows NVIDIA format
                        const parts = alert.message.split('Analysis:');
                        const summary = parts[0].replace('ALERT DETECTED:', '').trim();
                        const reasoning = parts[1] ? parts[1].trim() : alert.message;

                        return (
                            <div key={alert.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all group">
                                <div className="flex min-h-[140px]">
                                    {/* Image Thumbnail */}
                                    <div className="w-52 bg-black relative flex-shrink-0">
                                        {alert.imagePath ? (
                                            <img 
                                                src={`http://localhost:8000/cache/${alert.imagePath.split(/[\/\\]/).pop()}`} 
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                alt="Alert capture"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <AlertTriangle size={24} className="text-zinc-800" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-mono text-zinc-400">
                                            CAM_{alert.cameraId.substring(0,4).toUpperCase()}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-5 flex flex-col">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isHighRisk ? (
                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase tracking-wider border border-red-500/20">
                                                        High Risk
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-wider">
                                                        Warning
                                                    </span>
                                                )}
                                                <h3 className="text-zinc-200 font-bold">{alert.cameraName}</h3>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                                                <Clock size={12} />
                                                {time}
                                            </div>
                                        </div>

                                        <p className="text-white text-sm font-medium mb-3 leading-relaxed">
                                            {summary || alert.message.split('.')[0]}
                                        </p>

                                        {/* Reasoning Process (Nemotron Style) */}
                                        <div className="mt-auto bg-black/30 border-l-2 border-blue-500/50 p-3 rounded-r-lg">
                                            <div className="flex items-center gap-1.5 text-blue-400 text-[10px] uppercase font-bold tracking-tighter mb-1">
                                                <Info size={10} />
                                                VLM Reasoning Process
                                            </div>
                                            <p className="text-zinc-400 text-xs leading-relaxed italic">
                                                "{reasoning}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="w-16 border-l border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer">
                                        <Search size={20} className="text-zinc-600 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            {/* Footer Stats */}
            <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between text-[10px] text-zinc-600 font-medium">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> VLM ANALYSIS ACTIVE</span>
                    <span className="flex items-center gap-1"><Shield size={10} className="text-blue-500" /> SYSTEM SECURE</span>
                </div>
                <div>TOTAL EVENTS: {alerts.length}</div>
            </div>
        </div>
    );
}
