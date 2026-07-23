import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Leads from './pages/Leads';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kpr_auth_token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('kpr_auth_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('kpr_auth_token');
    setIsAuthenticated(false);
  };

  if (isChecking) return null;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Pass handleLogout to Layout if needed in the future
  return (
    <Routes>
      <Route path="/" element={<Layout onLogout={handleLogout} />}>
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
