import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AppSwitcher from './AppSwitcher';
import { Compass } from 'lucide-react';

export default function Layout({ onLogout }) {
  return (
    <div className="app-container">
      <Sidebar onLogout={onLogout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Top Operations Header */}
        <header style={{
          height: '60px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
            <span>KPR 99 Operations</span>
            <span>/</span>
            <span style={{ color: '#111827', fontWeight: '700' }}>Email Generator</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="https://pr-request.vercel.app/portal"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f5f3ff',
                color: '#6338f0',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid #ddd6fe',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
              title="Buka Pusat Kontrol Ops Terpadu"
            >
              <Compass size={14} color="#6338f0" />
              <span>Portal Ops</span>
            </a>
            <AppSwitcher currentApp="email" />
          </div>
        </header>

        <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
