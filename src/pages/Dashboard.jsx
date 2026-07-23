import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [senderFilter, setSenderFilter] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    fetch('/api/logs', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('kpr_auth_token') }
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          // Sort by Waktu Proses descending
          const sorted = data.data.sort((a, b) => new Date(b['Waktu Proses']) - new Date(a['Waktu Proses']));
          setLogs(sorted);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Filter Logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log['Nama Debitur'] || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter ? (log['Status'] || '') === statusFilter : true;
    const matchesBank = bankFilter ? (log['Bank Tujuan'] || '') === bankFilter : true;
    const matchesSender = senderFilter ? (log['PIC Pengirim'] || '') === senderFilter : true;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = log['Waktu Proses'] ? log['Waktu Proses'].split(' ')[0] : '';
      if (logDate) {
        if (startDate && logDate < startDate) matchesDate = false;
        if (endDate && logDate > endDate) matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesBank && matchesSender && matchesDate;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const dateA = new Date(a['Waktu Proses']);
    const dateB = new Date(b['Waktu Proses']);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Get unique values for dropdowns
  const uniqueStatuses = [...new Set(logs.map(log => log['Status']).filter(Boolean))];
  const uniqueBanks = [...new Set(logs.map(log => log['Bank Tujuan']).filter(Boolean))].sort();
  const uniqueSenders = [...new Set(logs.map(log => log['PIC Pengirim']).filter(Boolean))].sort();

  // --- Analytics Logic ---
  const totalDraft = filteredLogs.length;

  const totalPlafond = filteredLogs.reduce((acc, log) => {
    const pStr = String(log['Plafond Kredit'] || '0');
    const num = parseFloat(pStr.replace(/[^\d]/g, '')) || 0;
    return acc + num;
  }, 0);
  
  const formattedPlafond = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalPlafond);

  const bankCounts = {};
  filteredLogs.forEach(log => {
    const b = log['Bank Tujuan'];
    if (b) {
      bankCounts[b] = (bankCounts[b] || 0) + 1;
    }
  });
  let topBank = "-";
  let maxCount = 0;
  for (const [b, count] of Object.entries(bankCounts)) {
    if (count > maxCount) {
      topBank = b;
      maxCount = count;
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Log Aktivitas (Dashboard)</h1>
        <p className="page-description">Overview of all KPR email activities.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Total Draf Dibuat</span>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>{totalDraft}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Total Plafond</span>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>{formattedPlafond}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Bank Terpopuler</span>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>{topBank}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Recent Activity Logs</div>
        
        {/* Filters Section */}
        <div className="flex-row" style={{ marginBottom: '20px', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group flex-1" style={{ marginBottom: 0, minWidth: '200px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Cari Nama Debitur..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '130px' }}>
            <select className="form-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '130px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Mulai Tanggal</span>
            <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="Tanggal Mulai" />
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '130px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Sampai Tanggal</span>
            <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="Tanggal Akhir" />
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
            <select className="form-select" value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
              <option value="">Semua Bank</option>
              {uniqueBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '180px' }}>
            <select className="form-select" value={senderFilter} onChange={(e) => setSenderFilter(e.target.value)}>
              <option value="">Semua Pengirim</option>
              {uniqueSenders.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
            <select 
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div className="loader"></div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Bank</th>
                  <th>PIC Bank (To)</th>
                  <th>Status</th>
                  <th>Sender</th>
                  <th>Email Content</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>Tidak ada log yang sesuai filter.</td></tr>
                ) : (
                  sortedLogs.slice(0, 100).map((log, idx) => (
                    <tr key={idx}>
                      <td style={{ whiteSpace: 'nowrap' }}>{log['Waktu Proses']}</td>
                      <td>{log['Nama Debitur']}</td>
                      <td>{log['Bank Tujuan']}</td>
                      <td>{log['Email Tujuan (To)']}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: log['Status']?.includes('Sent') ? '#d1fae5' : '#fef3c7',
                          color: log['Status']?.includes('Sent') ? '#065f46' : '#92400e',
                          whiteSpace: 'nowrap'
                        }}>
                          {log['Status']}
                        </span>
                      </td>
                      <td>{log['PIC Pengirim']}</td>
                      <td style={{ maxWidth: '250px' }}>
                        {log['Isi Email'] ? (
                          <button 
                            onClick={() => setSelectedEmail(log)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            Baca Email
                          </button>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '13px' }}>Tidak ada data</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Popup for Email Content */}
      {selectedEmail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setSelectedEmail(null)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
            width: '90%', maxWidth: '650px', maxHeight: '85vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>Detail Email</h3>
              <button onClick={() => setSelectedEmail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '24px', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              
              {/* Email Metadata */}
              <div style={{ marginBottom: '16px', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', fontSize: '13px', border: '1px solid #e5e7eb' }}>
                <div style={{ marginBottom: '6px' }}><strong>Subject:</strong> Konfirmasi plafond akad {selectedEmail['Platform']} - {selectedEmail['Bank Tujuan']}</div>
                <div style={{ marginBottom: '6px' }}><strong>From:</strong> {selectedEmail['PIC Pengirim']}</div>
                <div style={{ marginBottom: '6px' }}><strong>To:</strong> {selectedEmail['Email Tujuan (To)']}</div>
                <div style={{ marginBottom: '6px' }}><strong>Time:</strong> {selectedEmail['Waktu Proses']}</div>
                <div><strong>Status:</strong> <span style={{ color: selectedEmail['Status']?.includes('Sent') ? '#059669' : '#d97706', fontWeight: '600' }}>{selectedEmail['Status']}</span></div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                  {selectedEmail['Isi Email']}
                </pre>
              </div>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setSelectedEmail(null)} className="btn btn-secondary">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
