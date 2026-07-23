import React, { useEffect, useState } from 'react';

export default function Settings({ title, category }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [kat, setKat] = useState('Komisi');
  const [nama, setNama] = useState('');
  const [isi, setIsi] = useState('');
  const [bank, setBank] = useState('OCBC');
  const [customBank, setCustomBank] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [category]);

  const fetchSettings = () => {
    setLoading(true);
    fetch('/api/settings', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('kpr_auth_token') }
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setSettings(data.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    let finalNama = nama;
    if (kat === 'Email Bank Tujuan') {
      const selectedBank = bank === 'Lainnya' ? customBank : bank;
      finalNama = `${selectedBank} | ${isi}`;
    }

    const url = editingRow ? `/api/settings/${editingRow}` : '/api/settings';
    const method = editingRow ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('kpr_auth_token')
      },
      body: JSON.stringify({ kategori: kat, nama: finalNama, isi })
    })
    .then(res => res.json())
    .then(data => {
      if(data.status === 'success') {
        alert(editingRow ? 'Preset updated successfully!' : 'Preset saved successfully!');
        handleCancelEdit();
        fetchSettings();
      } else {
        alert('Failed to save preset.');
      }
    })
    .catch(err => alert('Error saving preset'))
    .finally(() => setSubmitting(false));
  };

  const handleEdit = (row) => {
    setEditingRow(row['__sheet_row_number']);
    setKat(row.Kategori);
    
    if (row.Kategori === 'Email Bank Tujuan') {
      const parts = (row['Nama Template'] || '').split('|').map(s => s.trim());
      const b = parts[0] || 'OCBC';
      const isLainnya = !["OCBC", "Sinarmas", "INA", "UOB", "Permata", "Maybank", "Danamon", "BSI Jawa Timur", "Ganesha", "BSI", "Muamalat", "CIMB Niaga", "Mandiri", "KB", "CIMB Syariah"].includes(b);
      
      if (isLainnya) {
        setBank('Lainnya');
        setCustomBank(b);
      } else {
        setBank(b);
      }
    } else {
      setNama(row['Nama Template']);
    }
    setIsi(row['Isi Template']);
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setNama('');
    setIsi('');
    setCustomBank('');
    setBank('OCBC');
  };

  // Filter based on route (Prompts vs Settings)
  const isPrompts = category === 'prompts';
  const targetCategories = isPrompts ? ['Komisi', 'Penutup'] : ['Email CC', 'Email Pengirim', 'Email Bank Tujuan'];
  
  const filteredSettings = settings.filter(s => {
    if (!targetCategories.includes(s.Kategori)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (s['Nama Template'] || '').toLowerCase().includes(q) || 
             (s['Isi Template'] || '').toLowerCase().includes(q) ||
             (s.Kategori || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">Manage your templates and global configurations.</p>
      </div>

      <div className="flex-row">
        <div className="card flex-1">
          <div className="card-title">{editingRow ? 'Edit Preset' : 'Add New Preset'}</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={kat} onChange={e => setKat(e.target.value)}>
                {targetCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {kat === 'Email Bank Tujuan' ? (
              <div className="form-group">
                <label className="form-label">Pilih Bank</label>
                <select 
                  className="form-select" 
                  value={bank} 
                  onChange={e => setBank(e.target.value)}
                  style={{ marginBottom: bank === 'Lainnya' ? '8px' : '0' }}
                >
                  {[
                    "OCBC", "Sinarmas", "INA", "UOB", "Permata", "Maybank", "Danamon", 
                    "BSI Jawa Timur", "Ganesha", "BSI", "Muamalat", "CIMB Niaga", 
                    "Mandiri", "KB", "CIMB Syariah", "Lainnya"
                  ].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {bank === 'Lainnya' && (
                  <input 
                    required 
                    className="form-input" 
                    value={customBank} 
                    onChange={e => setCustomBank(e.target.value)} 
                    placeholder="Nama Bank Lainnya..." 
                  />
                )}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">{kat === 'Email CC' || kat === 'Email Pengirim' ? 'Email Address' : 'Template Name / Label'}</label>
                <input 
                  required 
                  className="form-input" 
                  value={nama} 
                  onChange={e => setNama(e.target.value)} 
                  placeholder={kat === 'Email CC' || kat === 'Email Pengirim' ? 'user@domain.com' : 'e.g. Preset 1'} 
                />
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">{kat.includes('Email') ? 'Email Address / Value' : 'Content / Value'}</label>
              <textarea 
                required 
                className="form-textarea" 
                value={isi} 
                onChange={e => {
                  setIsi(e.target.value);
                  if (kat === 'Email CC' || kat === 'Email Pengirim') {
                    setNama(e.target.value); // Sync nama and isi for non-bank emails
                  }
                }} 
                placeholder={kat.includes('Email') ? 'email@domain.com' : 'Content...'} 
                style={{ height: kat.includes('Email') ? '60px' : '120px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Saving...' : (editingRow ? 'Update Database' : 'Save to Database')}
              </button>
              {editingRow && (
                <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card flex-1">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="card-title" style={{ margin: 0 }}>Saved Presets</div>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Cari preset..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '200px', padding: '6px 12px' }}
            />
          </div>
          {loading ? (
            <div className="loader"></div>
          ) : (
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Name</th>
                    <th>Content</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSettings.length === 0 ? (
                    <tr><td colSpan="4">No presets found.</td></tr>
                  ) : (
                    filteredSettings.map((s, idx) => (
                      <tr key={idx} style={{ backgroundColor: editingRow === s['__sheet_row_number'] ? '#f3f4f6' : 'transparent' }}>
                        <td>{s.Kategori}</td>
                        <td>{s['Nama Template']}</td>
                        <td style={{ maxWidth: '250px' }}>
                          {s['Isi Template'] ? (
                            <details style={{ cursor: 'pointer' }}>
                              <summary style={{ fontSize: '13px', color: '#6338f0', fontWeight: '500' }}>Lihat Konten</summary>
                              <div style={{ 
                                marginTop: '8px', padding: '8px', backgroundColor: '#f8fafc', 
                                borderRadius: '6px', fontSize: '12px', border: '1px solid #e5e7eb',
                                maxHeight: '150px', overflowY: 'auto'
                              }}>
                                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                                  {s['Isi Template']}
                                </pre>
                              </div>
                            </details>
                          ) : '-'}
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => handleEdit(s)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
