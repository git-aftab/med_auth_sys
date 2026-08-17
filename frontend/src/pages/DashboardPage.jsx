import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, RefreshCw, CheckCircle2, XCircle,
  ChevronRight, ArrowRight, Filter
} from 'lucide-react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import LiveVerificationCard from '../components/dashboard/LiveVerificationCard';
import StatsOverview from '../components/dashboard/StatsOverview';
import VerificationDetailModal from '../components/verification/VerificationDetailModal';

export default function DashboardPage() {
  const { lastEvent } = useWebSocket();
  const [verifications, setVerifications] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [v, p, m] = await Promise.all([
        api.getVerifications(50), api.getPatients(), api.getMedications(),
      ]);
      setVerifications(v);
      setPatients(p);
      setMedications(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!lastEvent?.id) return;
    setVerifications(prev => {
      const exists = prev.some(x => x.id === lastEvent.id);
      return exists ? prev.map(x => x.id === lastEvent.id ? lastEvent : x)
                    : [lastEvent, ...prev];
    });
  }, [lastEvent]);

  const active   = lastEvent || verifications[0] || null;
  const filtered = verifications.filter(v =>
    filter === 'ALL'      ? true :
    filter === 'VERIFIED' ? v.status === 'VERIFIED' : v.status === 'REJECTED'
  );

  return (
    <div className="space-y-8 pb-16">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Medication Safety Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Real-time verification monitoring for your care team</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} disabled={loading}
            className="btn-ghost text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/simulate" className="btn-primary">
            Run Verification
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatsOverview verifications={verifications} patientsCount={patients.length} medsCount={medications.length} />

      {/* Live Card */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="live-dot" />
          <h2 className="text-sm font-semibold text-slate-200">Latest Verification</h2>
        </div>
        <LiveVerificationCard verification={active} />
      </section>

      {/* Recent Stream */}
      <section className="surface p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-100">Recent Checks</h3>
            <span className="text-xs text-slate-400 bg-ink-600/60 px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex bg-ink-800 border border-white/[0.06] rounded-xl p-1 text-xs font-medium">
              {['ALL', 'VERIFIED', 'REJECTED'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg transition ${
                    filter === f
                      ? f === 'VERIFIED' ? 'bg-emerald-950/80 text-emerald-300'
                        : f === 'REJECTED' ? 'bg-rose-950/80 text-rose-300'
                        : 'bg-ink-500 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}>{f}</button>
              ))}
            </div>
            <Link to="/audit" className="text-xs text-dose-400 hover:text-dose-300 ml-1 flex items-center gap-1">
              All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No records to display.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(v => {
              const ok = v.status === 'VERIFIED';
              return (
                <div key={v.id} onClick={() => setSelected(v)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-ink-700/40 border border-white/[0.04] hover:bg-ink-600/50 hover:border-white/[0.08] cursor-pointer transition group">

                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    ok ? 'bg-emerald-950/80 text-emerald-400' : 'bg-rose-950/80 text-rose-400'
                  }`}>
                    {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-200 truncate">{v.patient_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400 truncate">{v.prescribed_medication || 'No medication'}</p>
                  </div>

                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-mono text-slate-300">{Number(v.measured_weight_g||0).toFixed(3)}g</p>
                    <p className="text-[11px] text-slate-500">
                      {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ''}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-dose-400 transition" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selected && <VerificationDetailModal verification={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
