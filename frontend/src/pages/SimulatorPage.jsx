import React, { useState, useEffect } from 'react';
import {
  FlaskConical, RotateCcw, Play, CheckCircle2, AlertOctagon,
  Sliders, Layers, ArrowRight, ChevronRight, Camera, Scale, UserCheck
} from 'lucide-react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { sound } from '../utils/audio';

const PRESETS = [
  {
    name: 'Correct Medication',
    desc: 'John Doe · Paracetamol 500mg — all checks expected to pass',
    rfid: 'RFID_PATIENT_001', weight: 0.502, color: 'white',
    shape: 'oval', size: 12.5, epillid: '51285-0092-87_BE305F72', pass: true,
  },
  {
    name: 'Correct Medication',
    desc: 'Jane Smith · Amoxicillin 250mg — all checks expected to pass',
    rfid: 'RFID_PATIENT_002', weight: 0.351, color: 'yellow',
    shape: 'capsule', size: 14.0, epillid: '00093-0148-01_4629A34D', pass: true,
  },
  {
    name: 'Unknown Patient',
    desc: 'Unregistered wristband — immediate rejection at gate',
    rfid: 'RFID_UNKNOWN_999', weight: 0.500, color: 'white',
    shape: 'oval', size: 12.5, epillid: '51285-0092-87_BE305F72', pass: false,
  },
  {
    name: 'Weight Out of Range',
    desc: 'John Doe — tablet weight significantly below expected range',
    rfid: 'RFID_PATIENT_001', weight: 0.120, color: 'white',
    shape: 'oval', size: 12.5, epillid: '51285-0092-87_BE305F72', pass: false,
  },
  {
    name: 'Wrong Appearance',
    desc: 'John Doe — tablet colour and shape do not match prescription',
    rfid: 'RFID_PATIENT_001', weight: 0.500, color: 'red',
    shape: 'round', size: 10.0, epillid: '51285-0092-87_BE305F72', pass: false,
  },
  {
    name: 'Wrong Medication',
    desc: 'John Doe — different medication placed despite correct patient',
    rfid: 'RFID_PATIENT_001', weight: 0.500, color: 'white',
    shape: 'oval', size: 12.5, epillid: '00093-0054-01_1234ABCD', pass: false,
  },
];

const EPILLIDS = [
  { label: 'Paracetamol 500mg',  value: '51285-0092-87_BE305F72' },
  { label: 'Amoxicillin 250mg',  value: '00093-0148-01_4629A34D' },
  { label: 'Ibuprofen 400mg',    value: '00093-7248-06_7829BC3D' },
  { label: 'Metformin 850mg',    value: '00093-0054-01_1234ABCD' },
  { label: 'Atorvastatin 20mg',  value: '00093-0020-01_5678EFGH' },
  { label: 'Unknown',            value: 'UNKNOWN_UNREGISTERED_CLASS' },
];

export default function SimulatorPage() {
  const { injectEvent } = useWebSocket();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [rfid,    setRfid]    = useState('RFID_PATIENT_001');
  const [weight,  setWeight]  = useState(0.502);
  const [color,   setColor]   = useState('white');
  const [shape,   setShape]   = useState('oval');
  const [size,    setSize]    = useState(12.5);
  const [epillid, setEpillid] = useState('51285-0092-87_BE305F72');

  useEffect(() => {
    api.getPatients().then(setPatients).catch(console.error);
  }, []);

  const applyPreset = p => {
    setRfid(p.rfid); setWeight(p.weight); setColor(p.color);
    setShape(p.shape); setSize(p.size); setEpillid(p.epillid);
    sound.playScan();
  };

  const verify = async () => {
    setLoading(true); setResult(null);
    try {
      const r = await api.submitVerification({
        patient_rfid: rfid, measured_weight_g: +weight,
        measured_color: color, measured_shape: shape,
        measured_size_mm: +size, epillid_class_id: epillid || undefined,
      });
      setResult(r);
      injectEvent(r);
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const PILL_COLORS = {
    white: '#e2e8f0', yellow: '#fde047', red: '#f87171',
    blue: '#60a5fa', green: '#4ade80',
  };

  return (
    <div className="space-y-8 pb-16">

      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-slate-100">Verification Console</h1>
        <p className="text-sm text-slate-400 mt-0.5">Simulate medication checks against patient prescriptions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Controls — 7 cols */}
        <div className="lg:col-span-7 space-y-5">

          {/* Manual Controls */}
          <div className="surface p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <Sliders className="w-4 h-4 text-dose-400" />
                Manual Configuration
              </div>
              <button onClick={() => { sound.playTare(); }} className="btn-ghost text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Tare Scale
              </button>
            </div>

            {/* Patient selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5 text-dose-400" />
                Patient Wristband
              </label>
              <div className="grid grid-cols-3 gap-2">
                {patients.map(p => (
                  <button key={p.id} onClick={() => { setRfid(p.rfid_uid); sound.playScan(); }}
                    className={`p-3 rounded-xl border text-left transition text-sm ${
                      rfid === p.rfid_uid
                        ? 'bg-dose-500/10 border-dose-500/40 text-dose-200'
                        : 'bg-ink-700/40 border-white/[0.05] text-slate-400 hover:text-slate-200 hover:border-white/10'
                    }`}>
                    <p className="font-semibold truncate text-xs">{p.name}</p>
                  </button>
                ))}
              </div>
              <input value={rfid} onChange={e => setRfid(e.target.value)}
                placeholder="Wristband ID"
                className="w-full bg-ink-800 border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-dose-500/60 mt-1" />
            </div>

            {/* Weight slider */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" /> Scale Reading
                </span>
                <span className="text-emerald-400 font-mono font-bold text-base">{Number(weight).toFixed(3)}g</span>
              </label>
              <input type="range" min="0.05" max="1.50" step="0.001" value={weight}
                onChange={e => setWeight(parseFloat(e.target.value))}
                className="w-full h-2 bg-ink-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.050g</span><span>1.500g</span>
              </div>
            </div>

            {/* Vision characteristics */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                <Camera className="w-3.5 h-3.5 text-violet-400" /> Visual Profile
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Colour</p>
                  <select value={color} onChange={e => setColor(e.target.value)}
                    className="w-full bg-ink-800 border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-dose-500/60">
                    {['white','yellow','red','blue','green'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Shape</p>
                  <select value={shape} onChange={e => setShape(e.target.value)}
                    className="w-full bg-ink-800 border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-dose-500/60">
                    {['oval','round','capsule','oblong'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Size (mm)</p>
                  <input type="number" step="0.5" value={size} onChange={e => setSize(parseFloat(e.target.value)||0)}
                    className="w-full bg-ink-800 border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-dose-500/60" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Medication Reference</p>
                <select value={epillid} onChange={e => setEpillid(e.target.value)}
                  className="w-full bg-ink-800 border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-dose-500/60">
                  {EPILLIDS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>

            {/* Trigger */}
            <button onClick={verify} disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-dose-500 to-emerald-500 hover:from-dose-400 hover:to-emerald-400 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-dose-500/20 transition-all disabled:opacity-60">
              {loading
                ? <><RotateCcw className="w-4 h-4 animate-spin" /> Processing...</>
                : <><Play className="w-4 h-4 fill-white" /> Verify Medication</>
              }
            </button>
          </div>

          {/* Test Scenarios */}
          <div className="surface p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Layers className="w-4 h-4 text-dose-400" /> Quick Test Scenarios
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map((p, i) => (
                <button key={i} onClick={() => applyPreset(p)}
                  className="p-4 rounded-2xl bg-ink-700/50 border border-white/[0.05] hover:border-dose-500/30 hover:bg-ink-600/60 text-left transition group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-dose-300 transition">{p.name}</p>
                    <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.pass ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                             : 'bg-rose-950 text-rose-400 border border-rose-700/50'
                    }`}>{p.pass ? 'PASS' : 'FAIL'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview + Result — 5 cols */}
        <div className="lg:col-span-5 space-y-5">

          {/* Pill preview */}
          <div className="surface p-6 space-y-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Tablet Preview</p>
            <div className="relative aspect-video rounded-2xl bg-ink-800 border border-white/[0.05] overflow-hidden flex items-center justify-center">
              {/* Grid bg */}
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
              {/* Corner reticles */}
              <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 border-dose-400/40 rounded-tl" />
              <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 border-dose-400/40 rounded-tr" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-l-2 border-b-2 border-dose-400/40 rounded-bl" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-r-2 border-b-2 border-dose-400/40 rounded-br" />

              {/* Pill shape */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div
                  className={`shadow-xl border border-black/10 flex items-center justify-center font-mono text-xs font-bold text-slate-800 ${
                    shape === 'round' ? 'w-16 h-16 rounded-full'
                    : shape === 'capsule' ? 'w-20 h-10 rounded-full'
                    : shape === 'oval' ? 'w-20 h-12 rounded-full'
                    : 'w-24 h-10 rounded-lg'
                  }`}
                  style={{ backgroundColor: PILL_COLORS[color] || '#e2e8f0' }}
                >
                  {color}
                </div>
                <p className="text-xs font-mono text-slate-400 capitalize">{shape} · {size}mm</p>
              </div>

              {/* Bottom data overlay */}
              <div className="absolute bottom-3 inset-x-3 flex justify-between text-[10px] font-mono text-slate-500">
                <span>Weight: {Number(weight).toFixed(3)}g</span>
                <span className="text-dose-400">Camera Active</span>
              </div>
            </div>
          </div>

          {/* Result */}
          {result ? (
            <div className={`surface p-6 space-y-4 ${
              result.status === 'VERIFIED' ? 'border-emerald-500/25 shadow-glow-green' : 'border-rose-500/25 shadow-glow-red'
            }`}>
              <div className="flex items-center gap-3">
                {result.status === 'VERIFIED'
                  ? <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  : <AlertOctagon className="w-7 h-7 text-rose-400" />
                }
                <div>
                  <p className={`font-bold text-base ${result.status === 'VERIFIED' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {result.status === 'VERIFIED' ? 'Safe to Administer' : 'Administration Blocked'}
                  </p>
                  <p className="text-xs text-slate-400">{result.patient_name || 'Unknown'} · {result.prescribed_medication || 'No Rx'}</p>
                </div>
              </div>

              <div className="divide-y divide-white/[0.04] text-xs font-mono">
                {[
                  ['Patient',      result.checks?.patient_auth_passed],
                  ['Prescription', result.checks?.identity_check_passed],
                  ['Visual Match', result.checks?.appearance_check_passed],
                  ['Weight',       result.checks?.weight_check_passed],
                ].map(([label, pass]) => (
                  <div key={label} className="flex justify-between py-2">
                    <span className="text-slate-400">{label}</span>
                    <span className={pass ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>

              {result.failure_reasons?.length > 0 && (
                <div className="text-xs text-rose-200 bg-rose-950/40 border border-rose-700/40 rounded-xl p-3 space-y-1">
                  {result.failure_reasons.map((r, i) => <p key={i}>· {r}</p>)}
                </div>
              )}
            </div>
          ) : (
            <div className="surface p-8 text-center text-slate-500 text-sm">
              Run a verification or pick a test scenario to see results.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
