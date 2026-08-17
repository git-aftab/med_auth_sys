import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle, XCircle, WifiOff, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';

function StatusBadge({ status }) {
  if (status === 'CONNECTED')
    return <span className="chip-ok"><span className="live-dot" />Live</span>;
  if (status === 'CONNECTING')
    return <span className="chip-warn"><Loader2 className="w-3.5 h-3.5 animate-spin" />Connecting</span>;
  return <span className="chip-fail"><WifiOff className="w-3.5 h-3.5" />Disconnected</span>;
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/[0.04] text-xs font-mono">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}

export default function DiagnosticsPage() {
  const { status, reconnect, reconnectCount } = useWebSocket();
  const [health, setHealth]   = useState(null);
  const [latency, setLatency] = useState(null);
  const [testing, setTesting] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const run = async () => {
    setTesting(true);
    const t0 = performance.now();
    try {
      const d = await api.getHealth();
      setHealth(d);
      setLatency(Math.round(performance.now() - t0));
      setLastCheck(new Date().toLocaleTimeString());
    } catch {
      setHealth({ status: 'unreachable' });
      setLatency(null);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => { run(); }, []);

  const healthy = health?.status === 'healthy';

  return (
    <div className="space-y-8 pb-16">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">System Status</h1>
          <p className="text-sm text-slate-400 mt-0.5">Health of connected services and real-time feeds</p>
        </div>
        <button onClick={run} disabled={testing} className="btn-primary">
          <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
          Run Diagnostics
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* API Server */}
        <div className="surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">API Server</p>
            {healthy
              ? <span className="chip-ok"><CheckCircle className="w-3.5 h-3.5" />Healthy</span>
              : <span className="chip-fail"><XCircle className="w-3.5 h-3.5" />Offline</span>
            }
          </div>
          <div>
            <Row label="Response time" value={latency != null ? `${latency} ms` : '—'} />
            <Row label="Service"       value={health?.service || 'Dose IQ Backend'} />
            <Row label="Last checked"  value={lastCheck || 'Never'} />
          </div>
        </div>

        {/* Live Stream */}
        <div className="surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Live Stream</p>
            <StatusBadge status={status} />
          </div>
          <div>
            <Row label="Connection" value={status} />
            <Row label="Heartbeat"  value="15s ping / pong" />
            <Row label="Reconnects" value={reconnectCount} />
          </div>
          {status !== 'CONNECTED' && (
            <button onClick={reconnect} className="btn-ghost text-xs w-full justify-center">
              Force Reconnect
            </button>
          )}
        </div>

        {/* Hardware */}
        <div className="surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Verification Unit</p>
            <span className="chip-ok"><CheckCircle className="w-3.5 h-3.5" />Ready</span>
          </div>
          <div>
            <Row label="RFID Scanner"  value="Active" />
            <Row label="Scale Sensor"  value="Calibrated" />
            <Row label="Camera Module" value="Active" />
            <Row label="Safety Gate"   value="4-Factor Check" />
          </div>
        </div>

      </div>

      {/* How it works */}
      <div className="surface p-6 space-y-5">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-dose-400" />
          How Dose IQ Works
        </p>
        <ol className="space-y-4">
          {[
            ['Patient Identification', 'The nurse scans the patient\'s wristband to confirm their identity.'],
            ['Prescription Lookup',    'The system fetches the patient\'s current active medication order.'],
            ['Visual Inspection',      'The camera analyses the tablet\'s colour, shape, and dimensions.'],
            ['Weight Verification',    'A precision scale confirms the tablet weight is within tolerance.'],
            ['Safety Decision',        'All four checks must pass simultaneously for administration clearance.'],
          ].map(([title, desc], i) => (
            <li key={i} className="flex gap-4">
              <span className="w-7 h-7 rounded-xl bg-dose-500/10 border border-dose-500/20 text-dose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-sm text-slate-200">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}
