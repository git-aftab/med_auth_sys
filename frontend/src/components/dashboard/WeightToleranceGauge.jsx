import React from 'react';
import { Scale, CheckCircle, AlertTriangle } from 'lucide-react';

export default function WeightToleranceGauge({
  measuredWeight = 0,
  expectedWeight = 0,
  weightDelta    = 0,
  isPassed       = true,
}) {
  if (!expectedWeight) {
    return (
      <div className="surface-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">Weight Sensor</p>
            <p className="font-mono text-sm font-semibold text-slate-200">
              {Number(measuredWeight).toFixed(3)} g
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-500">No reference</span>
      </div>
    );
  }

  const tolerance = 0.05;
  const lo        = Math.max(0, expectedWeight - tolerance);
  const hi        = expectedWeight + tolerance;
  const span      = tolerance * 4;
  const rMin      = Math.max(0, expectedWeight - span);
  const rMax      = expectedWeight + span;
  const total     = rMax - rMin;

  const mPct      = Math.min(100, Math.max(0, ((measuredWeight - rMin) / total) * 100));
  const greenL    = ((lo - rMin) / total) * 100;
  const greenW    = ((hi - lo)   / total) * 100;
  const refPct    = ((expectedWeight - rMin) / total) * 100;

  return (
    <div className="surface-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className={`w-4 h-4 ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="text-xs text-slate-400 font-medium">Weight Verification</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold font-mono ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPassed
            ? <CheckCircle className="w-3.5 h-3.5" />
            : <AlertTriangle className="w-3.5 h-3.5" />
          }
          {Number(measuredWeight).toFixed(3)}g · Δ {Number(weightDelta).toFixed(3)}g
        </div>
      </div>

      {/* Track */}
      <div className="relative h-3 bg-ink-800 rounded-full overflow-hidden border border-white/[0.05]">
        {/* Green zone */}
        <div
          className="absolute inset-y-0 bg-emerald-500/25 border-x border-emerald-500/60"
          style={{ left: `${Math.max(0, greenL)}%`, width: `${Math.min(100, greenW)}%` }}
        />
        {/* Reference tick */}
        <div className="absolute inset-y-0 w-px bg-dose-400/80" style={{ left: `${refPct}%` }} />
      </div>

      {/* Needle */}
      <div className="relative h-3 -mt-2">
        <div
          className="absolute -top-1 -translate-x-1/2 transition-all duration-500"
          style={{ left: `${mPct}%` }}
        >
          <div className={`w-3.5 h-3.5 rounded-full border-2 border-ink-900 shadow-lg ${
            isPassed ? 'bg-emerald-400' : 'bg-rose-400 animate-bounce'
          }`} />
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1">
        <span>{lo.toFixed(3)}g</span>
        <span className="text-dose-400">{expectedWeight.toFixed(3)}g target</span>
        <span>{hi.toFixed(3)}g</span>
      </div>
    </div>
  );
}
