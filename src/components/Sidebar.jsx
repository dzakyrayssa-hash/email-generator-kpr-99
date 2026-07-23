import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, FileText, LogOut } from 'lucide-react';

export default function Sidebar({ onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo" style={{fontSize: '16px'}}>99 EMAIL KPR GENERATOR</div>
      </div>
      
      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1 }}>
          <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard />
            Dashboard
          </NavLink>
          <NavLink to="/leads" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users />
            Email Generator
          </NavLink>
          
          <div className="nav-section-title">ADMIN</div>
          
          <NavLink to="/admin/prompts" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText />
            Presets
          </NavLink>
          <NavLink to="/admin/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings />
            Settings
          </NavLink>
        </div>

        {onLogout && (
          <div style={{ padding: '20px 0' }}>
            <button 
              onClick={onLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogOut size={20} />
              Keluar (Log Out)
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}
