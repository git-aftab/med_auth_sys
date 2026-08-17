import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Cpu, Users, Pill, History, Activity,
  Volume2, VolumeX, Wifi, WifiOff, Loader2
} from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';

const nav = [
  { path: '/',            label: 'Overview',    icon: LayoutDashboard },
  { path: '/simulate',   label: 'Verification', icon: Cpu },
  { path: '/patients',   label: 'Patients',     icon: Users },
  { path: '/medications',label: 'Medications',  icon: Pill },
  { path: '/audit',      label: 'History',      icon: History },
  { path: '/diagnostics',label: 'System',       icon: Activity },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { status, soundEnabled, setSoundEnabled, reconnect } = useWebSocket();
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06]"
      style={{ background: 'rgba(10,14,26,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-6 h-15 flex items-center justify-between gap-8" style={{ height: 60 }}>

        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-dose-500 flex items-center justify-center shadow-glow-teal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white group-hover:text-dose-300 transition">Dose IQ</span>
            <span className="hidden sm:block text-[10px] text-slate-400 -mt-0.5 leading-none">Medication Safety Platform</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {nav.map(({ path, label, icon: Icon }) => {
            const active = pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-dose-500/10 text-dose-300 border border-dose-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Time */}
          <span className="hidden lg:block text-xs font-mono text-slate-400 tabular-nums">{time}</span>

          {/* Sound toggle */}
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled
                ? 'bg-ink-600/60 border-white/8 text-slate-300 hover:text-white'
                : 'bg-ink-700/40 border-white/5 text-slate-500 hover:text-slate-300'
            }`}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Connection status */}
          <button
            onClick={() => status !== 'CONNECTED' && reconnect()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              status === 'CONNECTED'
                ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
                : status === 'CONNECTING'
                ? 'bg-amber-950/40 border-amber-700/40 text-amber-300'
                : 'bg-rose-950/40 border-rose-700/40 text-rose-300'
            }`}>
            {status === 'CONNECTED' ? (
              <><span className="live-dot" /><span>Live</span></>
            ) : status === 'CONNECTING' ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Connecting</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5" /><span>Reconnect</span></>
            )}
          </button>
        </div>

      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center justify-around px-2 py-2 border-t border-white/[0.05] bg-ink-900/80 overflow-x-auto">
        {nav.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <Link key={path} to={path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-medium transition ${
                active ? 'text-dose-300' : 'text-slate-400'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
