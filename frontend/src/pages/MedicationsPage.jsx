import React, { useState, useEffect } from 'react';
import { Pill, Search } from 'lucide-react';
import api from '../services/api';

const COLOR_HEX = {
  white: '#e2e8f0', yellow: '#fde047', red: '#f87171',
  blue: '#60a5fa', green: '#4ade80',
};

export default function MedicationsPage() {
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getMedications()
      .then(d => { setMeds(d); setSelected(d[0] || null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = meds.filter(m => {
    const t = search.toLowerCase();
    return m.name.toLowerCase().includes(t) || m.strength.toLowerCase().includes(t);
  });

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Medication Formulary</h1>
          <p className="text-sm text-slate-400 mt-0.5">Reference profiles used for automated safety verification</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search medications…"
            className="w-full bg-ink-700/60 border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-dose-500/60" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* List — 7 cols */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading formulary…</div>
          ) : filtered.length === 0 ? (
            <div className="surface p-10 text-center text-slate-400 text-sm">No medications found.</div>
          ) : filtered.map(med => {
            const isSel = selected?.id === med.id;
            const lo    = (med.reference_weight_g - med.weight_tolerance_g).toFixed(3);
            const hi    = (med.reference_weight_g + med.weight_tolerance_g).toFixed(3);

            return (
              <div key={med.id} onClick={() => setSelected(med)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isSel
                    ? 'bg-ink-700/70 border-dose-500/40 shadow-glow-teal'
                    : 'bg-ink-800/40 border-white/[0.05] hover:border-white/10 hover:bg-ink-700/40'
                }`}>
                <div className="flex items-center gap-4">
                  {/* Pill colour swatch */}
                  <div className="w-12 h-10 rounded-xl border border-black/10 shadow-md shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-700 capitalize"
                    style={{ backgroundColor: COLOR_HEX[med.color] || '#e2e8f0' }}>
                    {med.shape?.slice(0,3)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-100">{med.name}</p>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-700/40">
                        {med.strength}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">
                      {med.color} · {med.shape} · {med.size_mm}mm
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Weight</p>
                    <p className="text-sm font-mono font-bold text-slate-200">{med.reference_weight_g}g</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">[{lo} – {hi}]</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel — 5 cols */}
        <div className="lg:col-span-5">
          {selected ? (
            <div className="surface p-6 space-y-5 sticky top-24">
              {/* Header */}
              <div className="flex items-center gap-4 pb-5 border-b border-white/[0.06]">
                <div className="w-14 h-14 rounded-2xl border border-black/10 shadow-lg flex items-center justify-center text-sm font-bold text-slate-700 capitalize"
                  style={{ backgroundColor: COLOR_HEX[selected.color] || '#e2e8f0' }}>
                  {selected.shape?.slice(0,3)}
                </div>
                <div>
                  <p className="text-[11px] text-dose-400 font-medium uppercase tracking-wider">Safety Profile</p>
                  <h3 className="text-lg font-bold text-slate-100">{selected.name} {selected.strength}</h3>
                </div>
              </div>

              {/* Physical traits */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Visual Characteristics</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    ['Colour', selected.color],
                    ['Shape',  selected.shape],
                    ['Size',   `${selected.size_mm}mm`],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="surface-sm p-3">
                      <p className="text-slate-500 text-[10px] mb-1 uppercase">{lbl}</p>
                      <p className="font-semibold text-slate-200 capitalize">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weight envelope */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Weight Tolerance</p>
                <div className="surface-sm p-4 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reference weight</span>
                    <span className="text-slate-200 font-bold">{selected.reference_weight_g}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tolerance</span>
                    <span className="text-dose-400 font-bold">±{selected.weight_tolerance_g}g</span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.06] flex justify-between">
                    <span className="text-slate-400">Acceptable range</span>
                    <span className="text-slate-200 font-bold">
                      {(selected.reference_weight_g - selected.weight_tolerance_g).toFixed(3)}g –
                      {(selected.reference_weight_g + selected.weight_tolerance_g).toFixed(3)}g
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="surface p-10 text-center text-slate-500 text-sm">
              Select a medication to view its profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
