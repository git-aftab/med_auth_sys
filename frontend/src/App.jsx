import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext';
import Navbar from './components/layout/Navbar';
import DashboardPage   from './pages/DashboardPage';
import SimulatorPage   from './pages/SimulatorPage';
import PatientsPage    from './pages/PatientsPage';
import MedicationsPage from './pages/MedicationsPage';
import AuditLogsPage   from './pages/AuditLogsPage';
import DiagnosticsPage from './pages/DiagnosticsPage';

export default function App() {
  return (
    <WebSocketProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <Routes>
              <Route path="/"             element={<DashboardPage />} />
              <Route path="/simulate"     element={<SimulatorPage />} />
              <Route path="/patients"     element={<PatientsPage />} />
              <Route path="/medications"  element={<MedicationsPage />} />
              <Route path="/audit"        element={<AuditLogsPage />} />
              <Route path="/diagnostics"  element={<DiagnosticsPage />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="border-t border-white/[0.05] py-6 text-center text-xs text-slate-500 mt-8">
            <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="font-medium text-slate-400">Dose IQ</span>
              <span>Smart medication safety for modern healthcare</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                4-Factor Verification Engine
              </span>
            </div>
          </footer>
        </div>
      </Router>
    </WebSocketProvider>
  );
}
