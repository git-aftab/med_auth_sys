import React from 'react';
import { X, CheckCircle2, XCircle, User, FileText, Eye, Scale, Clock, AlertTriangle, Fingerprint } from 'lucide-react';
import WeightToleranceGauge from '../dashboard/WeightToleranceGauge';

const FAILURE_COPY = {
  PATIENT_NOT_AUTHENTICATED: 'Patient wristband not found in system.',
  NO_ACTIVE_PRESCRIPTION:    'No active prescription found for this patient.',
  MEDICATION_MISMATCH:       'Medication identifier does not match the prescription.',
  APPEARANCE_MISMATCH:       'Visual characteristics do not match the expected profile.',
  WEIGHT_MISMATCH:           'Tablet weight is outside the acceptable tolerance range.',
};

export default function VerificationDetailModal({ verification, onClose }) {
  if (!verification) return null;

  const ok     = verification.status === 'VERIFIED';
  const checks = verification.checks || {};
  const ts     = verification.timestamp ? new Date(verification.timestamp).toLocaleString() : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,18,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-xl bg-ink-800 border border-white/[0.07] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={`p-6 flex items-center justify-between border-b border-white/[0.06] ${
          ok ? 'bg-emerald-950/30' : 'bg-rose-950/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              ok ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              {ok ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-100">
                {ok ? 'Safe to Administer' : 'Administration Blocked'}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> {ts}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-ink-600/80 hover:bg-ink-500 text-slate-400 hover:text-slate-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Patient + Rx */}
          <div className="grid grid-cols-2 gap-3">
            <div className="surface-sm p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Patient</p>
              <p className="font-semibold text-slate-200 text-sm">{verification.patient_name || 'Unknown'}</p>
              <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1">
                <Fingerprint className="w-3 h-3" /> {verification.patient_rfid}
              </p>
            </div>
            <div className="surface-sm p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Medication</p>
              <p className="font-semibold text-slate-200 text-sm">{verification.prescribed_medication || '—'}</p>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {verification.expected_weight_g ? `${verification.expected_weight_g}g expected` : 'No reference'}
              </p>
            </div>
          </div>

          {/* 4-factor matrix */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Safety Checks</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Patient ID',   pass: checks.patient_auth_passed },
                { label: 'Prescription', pass: checks.identity_check_passed },
                { label: 'Visual Match', pass: checks.appearance_check_passed },
                { label: 'Weight',       pass: checks.weight_check_passed },
              ].map(({ label, pass }) => (
                <div key={label} className={`px-4 py-2.5 rounded-xl text-xs font-medium flex justify-between ${
                  pass
                    ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'
                }`}>
                  <span>{label}</span>
                  <span className="font-mono font-bold">{pass ? 'PASS' : 'FAIL'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weight gauge */}
          <WeightToleranceGauge
            measuredWeight={verification.measured_weight_g}
            expectedWeight={verification.expected_weight_g}
            weightDelta={verification.weight_delta_g}
            isPassed={checks.weight_check_passed}
          />

          {/* Failures */}
          {(verification.failure_reasons || []).length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-700/40">
              <div className="flex items-center gap-2 text-xs text-rose-400 font-semibold mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Issues Detected
              </div>
              <ul className="space-y-1">
                {verification.failure_reasons.map((r, i) => (
                  <li key={i} className="text-sm text-rose-200 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-rose-400 mt-2 shrink-0" />
                    {FAILURE_COPY[r] || r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.05] bg-ink-800 flex justify-end">
          <button onClick={onClose} className="btn-ghost text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
