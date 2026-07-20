import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, FileText } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo" style={{fontSize: '16px'}}>99 EMAIL KPR GENERATOR</div>
      </div>
      
      <nav className="sidebar-nav">
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
      </nav>
    </aside>
  );
}
