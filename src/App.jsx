import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Leads from './pages/Leads';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/leads" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        
        <Route path="admin/prompts" element={<Settings title="Presets Database" category="prompts" />} />
        <Route path="admin/settings" element={<Settings title="System Settings" category="settings" />} />
      </Route>
    </Routes>
  );
}

export default App;
