import React from 'react';
import { ShieldCheck, TrendingUp, AlertCircle, Package } from 'lucide-react';

export default function StatsOverview({ verifications = [], patientsCount = 0, medsCount = 0 }) {
  const total     = verifications.length;
  const passed    = verifications.filter(v => v.status === 'VERIFIED').length;
  const blocked   = verifications.filter(v => v.status === 'REJECTED').length;
  const passRate  = total > 0 ? ((passed / total) * 100).toFixed(0) : '—';

  const cards = [
    {
      label: 'Safety Rate',
      value: total > 0 ? `${passRate}%` : '—',
      sub:   `${passed} of ${total} verified`,
      icon:  ShieldCheck,
      color: 'text-dose-400',
      bg:    'bg-dose-500/10 border-dose-500/20',
    },
    {
      label: 'Checks Today',
      value: total,
      sub:   'medication verifications',
      icon:  TrendingUp,
      color: 'text-sky-400',
      bg:    'bg-sky-500/10 border-sky-500/20',
    },
    {
      label: 'Errors Prevented',
      value: blocked,
      sub:   'administration blocks',
      icon:  AlertCircle,
      color: blocked > 0 ? 'text-rose-400' : 'text-slate-400',
      bg:    blocked > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-500/10 border-slate-500/20',
    },
    {
      label: 'Registry',
      value: `${patientsCount}p · ${medsCount}m`,
      sub:   'patients & medications',
      icon:  Package,
      color: 'text-violet-400',
      bg:    'bg-violet-500/10 border-violet-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
        <div key={label} className="surface p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
            <div className={`p-1.5 rounded-lg border ${bg} ${color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
          <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
      ))}
    </div>
  );
}
