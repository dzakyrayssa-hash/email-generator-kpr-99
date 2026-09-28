import React, { useState, useRef, useEffect } from 'react';
import { 
  Grid, 
  ExternalLink, 
  Activity, 
  Mail, 
  FileSpreadsheet, 
  Compass, 
  ChevronDown 
} from 'lucide-react';

export default function AppSwitcher({ currentApp = 'email' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const apps = [
    {
      id: 'hub',
      name: 'Mortgage Intelligence Hub',
      subtitle: 'Tele scorecard harian, pipeline summary & SLA',
      url: 'https://kpr-hub.vercel.app/',
      isActive: currentApp === 'hub',
      category: 'Intelligence & Analytics',
      icon: <Activity size={18} color="#0284c7" />,
      iconBg: '#f0f9ff',
      iconBorder: '#bae6fd'
    },
    {
      id: 'email',
      name: 'Email Generator KPR',
      subtitle: 'Generator template email bank & notifikasi leads',
      url: 'https://email-generator-kpr-99.vercel.app/leads',
      isActive: currentApp === 'email',
      category: 'Komunikasi & Email',
      icon: <Mail size={18} color="#7c3aed" />,
      iconBg: '#f5f3ff',
      iconBorder: '#ddd6fe'
    },
    {
      id: 'pr',
      name: 'PR Request & Leads Automation',
      subtitle: 'PR Excel, Agreement PDF agen & folder Leads Drive',
      url: 'https://pr-request.vercel.app/',
      isActive: currentApp === 'pr',
      category: 'Keuangan & Dokumen',
      icon: <FileSpreadsheet size={18} color="#059669" />,
      iconBg: '#ecfdf5',
      iconBorder: '#a7f3d0'
    }
  ];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block', textAlign: 'left' }} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#374151',
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
        aria-expanded={isOpen}
      >
        <Grid size={14} color="#6338f0" />
        <span>KPR Ops Suite</span>
        <ChevronDown 
          size={14} 
          color="#9ca3af" 
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          marginTop: '8px',
          width: '350px',
          borderRadius: '14px',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          border: '1px solid #e5e7eb',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(to right, #0f172a, #1e293b)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                backgroundColor: '#6338f0',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '11px'
              }}>
                99
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '-0.2px' }}>
                KPR Operations Suite
              </span>
            </div>
            <span style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              fontWeight: '700',
              letterSpacing: '0.5px',
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(99, 102, 241, 0.25)',
              color: '#c7d2fe',
              border: '1px solid rgba(165, 180, 252, 0.3)'
            }}>
              3 Modul
            </span>
          </div>

          {/* List of Apps */}
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {apps.map((app) => (
              <a
                key={app.id}
                href={app.url}
                target={app.isActive ? '_self' : '_blank'}
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  backgroundColor: app.isActive ? '#f5f3ff' : 'transparent',
                  border: app.isActive ? '1px solid #ddd6fe' : '1px solid transparent',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!app.isActive) e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (!app.isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: app.iconBg,
                  border: `1px solid ${app.iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {app.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#111827',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {app.name}
                    </h4>
                    {app.isActive ? (
                      <span style={{
                        flexShrink: 0,
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#ede9fe',
                        color: '#6d28d9'
                      }}>
                        Sedang Dibuka
                      </span>
                    ) : (
                      <ExternalLink size={12} color="#9ca3af" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                  <p style={{
                    margin: '3px 0 0 0',
                    fontSize: '11px',
                    color: '#6b7280',
                    lineHeight: '1.3',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {app.subtitle}
                  </p>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    color: '#9ca3af',
                    fontWeight: '500',
                    marginTop: '4px'
                  }}>
                    {app.category}
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* Footer Portal Link */}
          <div style={{
            padding: '10px 12px',
            backgroundColor: '#f9fafb',
            borderTop: '1px solid #f3f4f6'
          }}>
            <a
              href="https://pr-request.vercel.app/portal"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#6338f0',
                textDecoration: 'none',
                backgroundColor: 'transparent',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f3ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={14} color="#6338f0" />
                <span>Buka Launchpad Ops Terpusat</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700' }}>&rarr;</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
