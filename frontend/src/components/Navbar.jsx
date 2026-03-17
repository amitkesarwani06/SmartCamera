import React from 'react';
import { Shield, Settings } from 'lucide-react';

export default function Navbar({ onShowSettings, activeTab, onTabChange }) {
    return (
        <nav className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 z-10 shrink-0">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-500" />
                    <h1 className="text-xl font-bold text-zinc-100 tracking-wide font-sans">CityWatch<span className="text-blue-500">AI</span></h1>
                </div>

                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    <button
                        onClick={() => onTabChange('dashboard')}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === 'dashboard'
                                ? 'bg-zinc-800 text-white shadow-lg'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => onTabChange('intelligence')}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === 'intelligence'
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        Intelligence
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black">System Online</span>
                </div>
                <button
                    onClick={onShowSettings}
                    title="Automation Settings"
                    className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-700 hover:border-indigo-500/40 cursor-pointer transition-all duration-200"
                >
                    <Settings className="w-[18px] h-[18px]" />
                </button>
                <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-400 font-medium hover:bg-zinc-700 cursor-pointer transition-colors">
                    AD
                </div>
            </div>
        </nav>
    );
}

