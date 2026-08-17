import React from 'react';
import { CheckCircle, XCircle, User, FileText, Eye, Scale, Clock, Sparkles, AlertOctagon } from 'lucide-react';
import WeightToleranceGauge from './WeightToleranceGauge';

const FAILURE_COPY = {
  PATIENT_NOT_AUTHENTICATED: 'Patient wristband not found in registry.',
  NO_ACTIVE_PRESCRIPTION:    'No active prescription found for this patient.',
  MEDICATION_MISMATCH:       'Medication identifier does not match the prescription.',
  APPEARANCE_MISMATCH:       'Visual characteristics do not match the expected profile.',
  WEIGHT_MISMATCH:           'Tablet weight is outside the acceptable range.',
};

export default function LiveVerificationCard({ verification }) {
  if (!verification) {
    return (
      <div className="surface flex flex-col items-center justify-center min-h-[320px] p-10 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-ink-600/50 border border-white/[0.06] flex items-center justify-center text-dose-400">
          <Scale className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold text-slate-200">Awaiting verification</p>
          <p className="text-sm text-slate-400 mt-1">Place medication on the scale to begin</p>
        </div>
      </div>
    );
  }

  const ok      = verification.status === 'VERIFIED';
  const checks  = verification.checks || {};
  const reasons = verification.failure_reasons || [];
  const ts      = verification.timestamp ? new Date(verification.timestamp).toLocaleTimeString() : '';

  return (
    <div className={`surface overflow-hidden transition-all duration-500 ${
      ok ? 'shadow-glow-green border-emerald-500/20' : 'shadow-glow-red border-rose-500/20'
    }`}>
      {/* Top accent line */}
      <div className={`h-1 w-full ${ok
        ? 'bg-gradient-to-r from-emerald-500/60 via-dose-400 to-teal-500/60'
        : 'bg-gradient-to-r from-rose-500/60 via-red-400/80 to-orange-500/60'
      }`} />

      <div className="p-6 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              ok ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              {ok ? <CheckCircle className="w-6 h-6" strokeWidth={2.5} /> : <XCircle className="w-6 h-6" strokeWidth={2.5} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-bold ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {ok ? 'Safe to Administer' : 'Administration Blocked'}
                </h2>
                {ok && <Sparkles className="w-4 h-4 text-emerald-400 animate-bounce" />}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> {ts} · Session #{verification.id}
              </p>
            </div>
          </div>

          <span className={ok ? 'chip-ok' : 'chip-fail'}>
            {ok ? 'Verified' : 'Rejected'}
          </span>
        </div>

        {/* Patient + Medication row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="surface-sm p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-dose-500/10 text-dose-400 border border-dose-500/20">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Patient</p>
              <p className="font-semibold text-slate-100">{verification.patient_name || 'Unknown'}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{verification.patient_rfid}</p>
            </div>
          </div>

          <div className="surface-sm p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Prescribed</p>
              <p className="font-semibold text-slate-100">{verification.prescribed_medication || '—'}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {verification.expected_weight_g ? `${verification.expected_weight_g}g per dose` : 'No dosage'}
              </p>
            </div>
          </div>
        </div>

        {/* 4-factor checks */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Safety Checks</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Patient ID',   icon: User,     pass: checks.patient_auth_passed },
              { label: 'Prescription', icon: FileText,  pass: checks.identity_check_passed },
              { label: 'Visual Match', icon: Eye,       pass: checks.appearance_check_passed },
              { label: 'Weight',       icon: Scale,     pass: checks.weight_check_passed },
            ].map(({ label, icon: Icon, pass }) => (
              <div key={label} className={pass ? 'factor-ok' : 'factor-fail'}>
                <div>
                  <Icon className="w-3.5 h-3.5 mb-1" />
                  <p className="text-xs font-medium">{label}</p>
                </div>
                <span className={`text-[11px] font-bold font-mono ${pass ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pass ? 'PASS' : 'FAIL'}
                </span>
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

        {/* Failure reasons */}
        {reasons.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-700/40 flex gap-3">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {reasons.map((r, i) => (
                <p key={i} className="text-sm text-rose-200">
                  {FAILURE_COPY[r] || r}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
