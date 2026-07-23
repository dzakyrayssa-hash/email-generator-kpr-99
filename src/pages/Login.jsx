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
      background: 'linear-gradient(135deg, #f0ecfc 0%, #c797eb 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#6338f0',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 4px 14px 0 rgba(99, 56, 240, 0.39)'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
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
            className="btn btn-primary" 
            disabled={loading || !password}
            style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: '600', marginTop: '8px' }}
          >
            {loading ? 'Memeriksa...' : 'Masuk Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
