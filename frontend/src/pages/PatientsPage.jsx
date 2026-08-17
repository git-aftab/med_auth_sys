import React, { useState, useEffect } from 'react';
import { Users, Search, AlertCircle, Play, Fingerprint, FileText } from 'lucide-react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const pts = await api.getPatients();
        setPatients(pts);
        const rxMap = {};
        await Promise.all(pts.map(async p => {
          try { rxMap[p.rfid_uid] = await api.getPatientPrescription(p.rfid_uid); }
          catch { rxMap[p.rfid_uid] = null; }
        }));
        setPrescriptions(rxMap);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = patients.filter(p => {
    const t = search.toLowerCase();
    return p.name.toLowerCase().includes(t) || p.rfid_uid.toLowerCase().includes(t);
  });

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Patient Registry</h1>
          <p className="text-sm text-slate-400 mt-0.5">Registered patients and their active medication orders</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full bg-ink-700/60 border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-dose-500/60 font-medium" />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading patients…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(patient => {
            const rx     = prescriptions[patient.rfid_uid];
            const hasRx  = !!rx?.medication;
            const initials = patient.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

            return (
              <div key={patient.id} className="surface p-6 flex flex-col gap-4 hover:border-dose-500/25 transition-all group">
                {/* Top */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-dose-600 to-dose-800 flex items-center justify-center text-white font-bold text-sm">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100 group-hover:text-dose-300 transition">{patient.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{patient.rfid_uid}</p>
                    </div>
                  </div>
                  <span className="chip-ok">Active</span>
                </div>

                {/* Prescription */}
                <div className="border-t border-white/[0.05] pt-4">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Active Prescription
                  </p>
                  {hasRx ? (
                    <div className="surface-sm p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-200">{rx.medication.name}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-dose-500/10 text-dose-300 border border-dose-500/20">
                          {rx.medication.strength}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <div>
                          <p className="text-[10px] uppercase text-slate-500 mb-0.5">Dosage</p>
                          <p className="text-slate-300">{rx.dosage}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-slate-500 mb-0.5">Schedule</p>
                          <p className="text-slate-300">{rx.frequency}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="surface-sm p-3 flex items-center gap-2 text-xs text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      No active prescription
                    </div>
                  )}
                </div>

                {/* Action */}
                <Link to="/simulate"
                  className="mt-auto flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/[0.06] text-xs font-medium text-slate-400 hover:text-dose-300 hover:border-dose-500/30 transition">
                  <Play className="w-3.5 h-3.5" /> Run Verification
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
