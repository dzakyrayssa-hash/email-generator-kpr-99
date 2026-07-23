import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        onLogin(data.token);
      } else {
        setError(data.detail || 'Password salah!');
      }
    } catch (err) {
      setError('Gagal terhubung ke server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          background: '#ff5924',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 4px 14px 0 rgba(255, 89, 36, 0.39)',
          color: 'white',
          fontWeight: '900',
          fontSize: '22px',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: '1'
        }}>
          99
          <span style={{ fontSize: '12px', fontWeight: '600' }}>.co</span>
        </div>
        
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', color: '#111827', fontWeight: '700' }}>
          Area Terbatas
        </h1>
        <p style={{ margin: '0 0 32px', color: '#6b7280', fontSize: '14px' }}>
          Masukkan kata sandi untuk masuk ke sistem KPR Email Generator.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Kata Sandi (Password)</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password..."
              autoFocus
              style={{ padding: '12px 16px', fontSize: '15px' }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', textAlign: 'left', padding: '8px 12px', background: '#fee2e2', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !password}
            style={{ 
              width: '100%', padding: '14px', fontSize: '16px', fontWeight: '600', marginTop: '8px',
              backgroundColor: '#ff5924', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
              opacity: (loading || !password) ? 0.7 : 1,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => !loading && password && (e.target.style.backgroundColor = '#e04a1c')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#ff5924')}
          >
            {loading ? 'Memeriksa...' : 'Masuk Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
