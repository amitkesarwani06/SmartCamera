import React from 'react';
import { Shield } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 z-10 shrink-0">
            <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-500" />
                <h1 className="text-xl font-bold text-zinc-100 tracking-wide font-sans">CityWatch<span className="text-blue-500">AI</span></h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">System Online</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-400 font-medium hover:bg-zinc-700 cursor-pointer transition-colors">
                    AD
                </div>
            </div>
        </nav>
    );
}
