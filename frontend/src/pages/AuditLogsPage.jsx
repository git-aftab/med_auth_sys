import React, { useState, useEffect } from 'react';
import { Search, Download, RefreshCw, CheckCircle2, XCircle, Eye, ChevronDown } from 'lucide-react';
import api from '../services/api';
import VerificationDetailModal from '../components/verification/VerificationDetailModal';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try { setLogs(await api.getVerifications(100)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = logs.filter(l => {
    const t  = search.toLowerCase();
    const ok = (l.patient_name||'').toLowerCase().includes(t) ||
               l.patient_rfid.toLowerCase().includes(t) ||
               (l.prescribed_medication||'').toLowerCase().includes(t);
    return ok && (filter === 'ALL' || l.status === filter);
  });

  const exportCSV = () => {
    const hdr = ['ID','Status','Patient','RFID','Medication','Weight (g)','Delta (g)','Failures','Time'];
    const rows = filtered.map(l => [
      l.id, l.status, `"${l.patient_name||''}"`, l.patient_rfid,
      `"${l.prescribed_medication||''}"`, l.measured_weight_g,
      l.weight_delta_g||'', `"${(l.failure_reasons||[]).join('; ')}"`,
      `"${l.timestamp||''}"`,
    ]);
    const csv  = 'data:text/csv;charset=utf-8,' + [hdr, ...rows].map(r => r.join(',')).join('\n');
    const link = Object.assign(document.createElement('a'), {
      href: encodeURI(csv), download: `dose_iq_audit_${new Date().toISOString().slice(0,10)}.csv`
    });
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-16">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Verification History</h1>
          <p className="text-sm text-slate-400 mt-0.5">Complete audit log of all safety checks</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetch} disabled={loading} className="btn-ghost text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={exportCSV} disabled={!filtered.length} className="btn-ghost text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="surface px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient, medication…"
            className="w-full bg-ink-800 border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-dose-500/60" />
        </div>
        <div className="flex items-center bg-ink-800 border border-white/[0.06] rounded-xl p-1 text-xs font-medium gap-1">
          {[['ALL', logs.length], ['VERIFIED', logs.filter(l=>l.status==='VERIFIED').length], ['REJECTED', logs.filter(l=>l.status==='REJECTED').length]].map(([f, count]) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === f
                  ? f==='VERIFIED' ? 'bg-emerald-950 text-emerald-300'
                    : f==='REJECTED' ? 'bg-rose-950 text-rose-300'
                    : 'bg-ink-500 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              {f} <span className="opacity-60 ml-0.5">({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr className="text-left">
                {['Status','Patient','Medication','Checks','Weight','Time',''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-500 text-sm">Loading records…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-500 text-sm">No records match your filter.</td></tr>
              ) : filtered.map(log => {
                const ok  = log.status === 'VERIFIED';
                const chk = log.checks || {};
                const ts  = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';

                return (
                  <tr key={log.id} onClick={() => setSelected(log)}
                    className="hover:bg-ink-700/30 cursor-pointer transition group">

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={ok ? 'chip-ok' : 'chip-fail'}>
                        {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {ok ? 'Verified' : 'Rejected'}
                      </span>
                    </td>

                    {/* Patient */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-200 text-sm">{log.patient_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 font-mono">{log.patient_rfid}</p>
                    </td>

                    {/* Medication */}
                    <td className="px-5 py-3.5 text-slate-300 text-sm">
                      {log.prescribed_medication || <span className="text-slate-500 italic">None</span>}
                    </td>

                    {/* 4-factor badges */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {[
                          [chk.patient_auth_passed, 'P'],
                          [chk.identity_check_passed, 'R'],
                          [chk.appearance_check_passed, 'V'],
                          [chk.weight_check_passed, 'W'],
                        ].map(([pass, lbl]) => (
                          <span key={lbl} title={lbl}
                            className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                              pass ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'
                            }`}>{lbl}</span>
                        ))}
                      </div>
                    </td>

                    {/* Weight */}
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-300">
                      {Number(log.measured_weight_g||0).toFixed(3)}g
                      {log.weight_delta_g != null && (
                        <span className="text-slate-500 block">Δ {Number(log.weight_delta_g).toFixed(3)}g</span>
                      )}
                    </td>

                    {/* Time */}
                    <td className="px-5 py-3.5 text-xs text-slate-400">{ts}</td>

                    {/* Inspect */}
                    <td className="px-5 py-3.5">
                      <button onClick={e => { e.stopPropagation(); setSelected(log); }}
                        className="p-1.5 rounded-lg bg-ink-600/60 hover:bg-ink-500 text-slate-400 hover:text-dose-300 transition">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <VerificationDetailModal verification={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
