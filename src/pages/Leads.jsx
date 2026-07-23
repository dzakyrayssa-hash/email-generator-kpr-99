import React, { useEffect, useState } from 'react';
import Select from 'react-select';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 1. Pilih Transaksi
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  // 2. Salam & Penerima
  const [waktuSalam, setWaktuSalam] = useState('Selamat pagi');
  const [panggilan, setPanggilan] = useState('Bapak');
  const [namaPenerima, setNamaPenerima] = useState('');
  const [bankTujuan, setBankTujuan] = useState('');

  // 3. Pengaturan Email
  const [ddTo, setDdTo] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [ddFrom, setDdFrom] = useState('akun.kantor@99.co');
  const [emailFrom, setEmailFrom] = useState('akun.kantor@99.co');
  const [selectedCc, setSelectedCc] = useState([]);
  const [customCc, setCustomCc] = useState('');

  // 4. Tinjauan Data Otomatis
  const [formatLaporan, setFormatLaporan] = useState('Vertikal Ke Bawah (Komplit)');
  const [namaDebitur, setNamaDebitur] = useState('');
  const [tanggalAkad, setTanggalAkad] = useState('');
  const [produkKpr, setProdukKpr] = useState('');
  
  // Plafond
  const [modePlafond, setModePlafond] = useState('Standar (1 Baris)');
  const [plafondStandar, setPlafondStandar] = useState('');
  const [topUpVal, setTopUpVal] = useState('0');
  
  // Spesifik Bank
  const [uobSalesName, setUobSalesName] = useState('');
  const [uobKomisiPaid, setUobKomisiPaid] = useState(false);
  const [permataDiskon, setPermataDiskon] = useState(false);
  const [permataPersen, setPermataPersen] = useState('');

  // 5. Komisi & Penutup
  const [komisiPreset, setKomisiPreset] = useState('Template Utama (Bullet Point Rapi)');
  const [komisiText, setKomisiText] = useState('');
  const [penutupPreset, setPenutupPreset] = useState('Template Standar');
  const [penutupText, setPenutupText] = useState('');

  const fetchData = () => {
    setLoading(true);
    const headers = { 'Authorization': 'Bearer ' + localStorage.getItem('kpr_auth_token') };
    Promise.all([
      fetch('/api/leads', { headers }).then(res => res.json()),
      fetch('/api/settings', { headers }).then(res => res.json())
    ]).then(([leadsData, settingsData]) => {
      if (leadsData.status === 'success') setLeads(leadsData.data);
      if (settingsData.status === 'success') setSettings(settingsData.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Settings
  const emailBankSettings = settings.filter(s => s.Kategori === 'Email Bank Tujuan');
  const emailPengirimSettings = settings.filter(s => s.Kategori === 'Email Pengirim');
  const emailCcSettings = settings.filter(s => s.Kategori === 'Email CC');
  const komisiSettings = settings.filter(s => s.Kategori === 'Komisi');
  const penutupSettings = settings.filter(s => s.Kategori === 'Penutup');

  // Helpers
  const parseNumeric = (val) => {
    const digits = String(val).replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };
  const formatIdr = (amount) => `Rp ${amount.toLocaleString('id-ID')}`.replace(/,/g, '.');

  const handleLeadChange = (selectedOption) => {
    const id = selectedOption ? selectedOption.value : '';
    setSelectedLeadId(id);
    const lead = leads.find(l => l.id === id);
    setSelectedLead(lead || null);
    
    if (lead) {
      setNamaDebitur(lead.name);
      setTanggalAkad(lead.date);
      setProdukKpr(lead.product);
      setPlafondStandar(lead.plafond);
      setBankTujuan(lead.bank);
      
      // Filter options for this specific bank intelligently
      const bankKeyword = lead.bank.toLowerCase().split(' ')[0]; // e.g. "CIMB Niaga" -> "cimb"
      const matchingBankEmails = emailBankSettings.filter(s => {
        const label = s['Nama Template'].toLowerCase();
        const isi = s['Isi Template'].toLowerCase();
        return label.includes(bankKeyword) || isi.includes(bankKeyword);
      });

      if (matchingBankEmails.length > 0) {
        setDdTo(matchingBankEmails[0]['Nama Template']);
        setEmailTo(matchingBankEmails[0]['Isi Template']);
      } else {
        setDdTo('-- Ketik Manual / Kosongkan --');
        setEmailTo('');
      }

      setKomisiPreset('Template Utama (Bullet Point Rapi)');
      updateKomisiText('Template Utama (Bullet Point Rapi)');
      
      let defaultPenutup = 'Template Standar';
      if (['Permata', 'UOB', 'CIMB Syariah'].includes(lead.bank)) {
        defaultPenutup = `Template Otomatis Bank ${lead.bank}`;
      }
      setPenutupPreset(defaultPenutup);
      updatePenutupText(defaultPenutup, lead.bank, lead.date);
    }
  };

  const leadOptions = leads.map(lead => ({
    value: lead.id,
    label: `[${lead.bank}] ${lead.name} - ${lead.date}`
  }));

  const updateKomisiText = (preset) => {
    if (preset === 'Template Utama (Bullet Point Rapi)') {
      setKomisiText("Mohon informasinya juga mengenai komisi KPR:\n- Apakah komisi dibayarkan sesuai 1% dari nilai plafond?\n- Atau terdapat penyesuaian dikarenakan permohonan diskon / program khusus dari pihak bank?");
    } else if (preset === 'Kosong / Ketik Manual') {
      setKomisiText('');
    } else {
      const found = komisiSettings.find(s => s['Nama Template'] === preset);
      setKomisiText(found ? found['Isi Template'] : '');
    }
  };

  const handleKomisiChange = (e) => {
    setKomisiPreset(e.target.value);
    updateKomisiText(e.target.value);
  };

  const updatePenutupText = (preset, bank, date) => {
    if (preset === 'Template Standar') {
      setPenutupText("Mohon dibantu konfirmasi apabila transaksi tersebut sudah benar. Terima kasih.");
    } else if (preset === `Template Otomatis Bank ${bank}`) {
      if (bank === 'Permata') {
        setPenutupText("Apakah informasi tersebut benar, apakah nasabah ada permohonan diskon provisi ke perbankan, dan apakah nominal komisi yang dibayarkan 1% dari plafond?\n\nAtas perhatian dan kerja samanya, terima kasih.");
      } else if (bank === 'UOB') {
        setPenutupText(`Informasi ybs sudah akad di bank UOB tanggal ${date}.\n\nTerima kasih atas bantuan dan supportnya.`);
      } else {
        setPenutupText("Mohon konfirmasinya atas data tersebut. Terima kasih.");
      }
    } else if (preset === 'Kosong / Ketik Manual') {
      setPenutupText('');
    } else {
      const found = penutupSettings.find(s => s['Nama Template'] === preset);
      setPenutupText(found ? found['Isi Template'] : '');
    }
  };

  const handlePenutupChange = (e) => {
    setPenutupPreset(e.target.value);
    updatePenutupText(e.target.value, bankTujuan, tanggalAkad);
  };

  const handleDdToChange = (e) => {
    const val = e.target.value;
    setDdTo(val);
    if (val !== '-- Ketik Manual / Kosongkan --') {
      const found = emailBankSettings.find(s => s['Nama Template'] === val);
      if (found) setEmailTo(found['Isi Template']);
    }
  };

  const handleDdFromChange = (e) => {
    const val = e.target.value;
    setDdFrom(val);
    if (val !== '-- Ketik Manual / Kosongkan --') {
      setEmailFrom(val);
    }
  };

  const toggleCc = (email) => {
    if (selectedCc.includes(email)) {
      setSelectedCc(selectedCc.filter(e => e !== email));
    } else {
      setSelectedCc([...selectedCc, email]);
    }
  };

  const generateEmailBody = () => {
    if (!selectedLead) return { subject: '', body: '', plafondLog: '' };

    const platform = selectedLead.platform || 'Rumah123';
    const subjek = `Konfirmasi plafond akad ${platform} - ${bankTujuan}`;
    
    let salam = '';
    if (waktuSalam !== 'Tanpa Salam') {
      salam = `${waktuSalam}${panggilan !== 'Tanpa Panggilan' ? ' ' + panggilan : ''}${namaPenerima ? ' ' + namaPenerima : ''},\n\n`;
    }

    let pengantar = `Di bawah ini adalah transaksi leads KPR referral ${platform} yang sudah akad di Bank ${bankTujuan}:`;
    if (bankTujuan === 'CIMB Syariah') pengantar = "Mohon bantuannya konfirmasi akad terkait dengan nasabah sbb:";
    if (bankTujuan === 'UOB') pengantar = "Mohon bantuannya untuk konfirmasi data nasabah sbb:";

    let stringPlafondEmail = '';
    let plafondLog = plafondStandar;
    
    if (modePlafond === 'Pecah Take Over + Top Up (3 Baris)') {
      const totalAwal = parseNumeric(selectedLead.plafond);
      const tu = parseNumeric(topUpVal);
      const to = totalAwal - tu;
      stringPlafondEmail = `Plafond Take Over : ${formatIdr(to)}.-\nPlafond Top Up    : ${formatIdr(tu)}.-\nTotal Plafond     : ${formatIdr(totalAwal)}.-`;
      plafondLog = `${formatIdr(totalAwal)}.-`;
    } else {
      stringPlafondEmail = `Plafond      : ${plafondStandar}`;
    }

    let noteBank = '';
    if (bankTujuan === 'UOB' && uobKomisiPaid) noteBank = 'dan komisi sudah di-payment ke 99.co';
    if (bankTujuan === 'Permata' && permataDiskon) noteBank = `nasabah mengajukan diskon provisi menjadi ${permataPersen}`;

    let detailData = '';
    if (formatLaporan === 'Satu Baris (Simpel)') {
      detailData = `1. ${namaDebitur}   ${tanggalAkad}   - ${plafondLog}`;
      if (noteBank) detailData += ` (${noteBank})`;
    } else {
      detailData = `Nama Debitur : ${namaDebitur}\n${stringPlafondEmail}\nProduct      : ${produkKpr}\nTgl Akad     : ${tanggalAkad}`;
      if (bankTujuan === 'UOB' && uobSalesName) {
        detailData += `\nSales        : ${uobSalesName}\nKomisi       : 1% dari Plafond`;
      }
    }

    let penutupFinal = penutupText.trim();
    if (komisiText.trim() && !penutupFinal.includes(komisiText.trim())) {
      penutupFinal += `\n\n${komisiText.trim()}`;
    }

    const body = `${salam}${pengantar}\n\n${detailData}\n\n${penutupFinal}`;
    return { subject: subjek, body, plafondLog };
  };

  const handleSend = () => {
    if (!tanggalAkad.trim()) return alert("Tanggal akad wajib diisi.");
    if (modePlafond === 'Pecah Take Over + Top Up (3 Baris)') {
      if (parseNumeric(topUpVal) > parseNumeric(selectedLead.plafond)) {
        return alert("Nominal Top Up tidak boleh lebih besar dari total plafond.");
      }
    }

    const { subject, body, plafondLog } = generateEmailBody();
    let finalCc = [...selectedCc];
    if (customCc) finalCc = finalCc.concat(customCc.split(',').map(s => s.trim()).filter(s => s));

    // 1. Save Log to Database
    setSending(true);
    fetch('/api/logs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('kpr_auth_token')
      },
      body: JSON.stringify({
        transaction_id: selectedLead.id,
        source_row: selectedLead.row_number,
        nama: namaDebitur,
        bank: bankTujuan,
        plafond: plafondLog,
        email_to: emailTo,
        pic_pengirim: emailFrom,
        platform: selectedLead.platform,
        status: 'Draft Generated',
        catatan: 'Draft dibuka via Gmail Web',
        isi_email: body
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status !== 'success') {
        console.error('Failed to save log', data);
      }
    })
    .catch(err => console.error('Error saving log:', err))
    .finally(() => setSending(false));

    // 2. Open Gmail Web Compose Window
    const gmailUrl = new URL('https://mail.google.com/mail/?view=cm&fs=1');
    if (emailTo) gmailUrl.searchParams.append('to', emailTo);
    if (finalCc.length > 0) gmailUrl.searchParams.append('cc', finalCc.join(', '));
    gmailUrl.searchParams.append('su', subject);
    gmailUrl.searchParams.append('body', body);
    if (emailFrom) gmailUrl.searchParams.append('authuser', emailFrom);

    window.open(gmailUrl.toString(), '_blank');
  };

  const handleCopyEmail = () => {
    const { body } = generateEmailBody();
    navigator.clipboard.writeText(body);
    alert('Teks email berhasil disalin ke clipboard!');
  };

  if (loading) return <div className="loader" style={{margin: '40px auto', display: 'block'}}></div>;

  const bankKeyword = bankTujuan.toLowerCase().split(' ')[0];
  const emailBankOptions = emailBankSettings.filter(s => {
    if (!bankKeyword) return true;
    const label = s['Nama Template'].toLowerCase();
    const isi = s['Isi Template'].toLowerCase();
    return label.includes(bankKeyword) || isi.includes(bankKeyword);
  });

  const { subject: previewSubject, body: previewBody } = generateEmailBody();
  const finalCc = [...selectedCc, customCc].filter(Boolean).join(', ');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Email Generator</h1>
        <p className="page-description">Generate draft email konfirmasi akad dan kirim langsung via Gmail API.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN: FORM CONTROLS */}
        <div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div className="card-title" style={{ fontSize: '14px', color: '#6338f0', margin: 0 }}>1. Pilih Transaksi</div>
              <button 
                onClick={fetchData} 
                style={{ 
                  background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500' 
                }}
                title="Tarik data terbaru dari Google Sheets"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.27l-3.27-3.27"/></svg>
                Sync Data
              </button>
            </div>
            <Select 
              options={leadOptions}
              value={leadOptions.find(opt => opt.value === selectedLeadId) || null}
              onChange={handleLeadChange}
              placeholder="-- Cari dan Pilih Nasabah --"
              isClearable
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e5e7eb',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#6338f0'
                  }
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#6338f0' : state.isFocused ? '#f0ecfc' : 'white',
                  color: state.isSelected ? 'white' : '#1a1a24'
                })
              }}
            />
          </div>

          {selectedLead && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div className="card" style={{ padding: '20px' }}>
                <div className="card-title" style={{ fontSize: '14px', color: '#6338f0' }}>2. Kontak & Tujuan Email</div>
                
                <div className="flex-row" style={{ marginBottom: '16px' }}>
                  <div className="form-group flex-1">
                    <label className="form-label">PIC Bank (To)</label>
                    <select className="form-select" value={ddTo} onChange={handleDdToChange} style={{ marginBottom: '8px' }}>
                      <option>-- Ketik Manual / Kosongkan --</option>
                      {emailBankOptions.map((s, i) => <option key={i} value={s['Nama Template']}>{s['Nama Template']}</option>)}
                    </select>
                    <input className="form-input" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="email.bank@domain.com" />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Pengirim (From)</label>
                    <select className="form-select" value={ddFrom} onChange={handleDdFromChange} style={{ marginBottom: '8px' }}>
                      <option>-- Ketik Manual / Kosongkan --</option>
                      {emailPengirimSettings.map((s, i) => <option key={i} value={s['Nama Template']}>{s['Nama Template']}</option>)}
                    </select>
                    <input className="form-input" value={emailFrom} onChange={e => setEmailFrom(e.target.value)} placeholder="email.pengirim@domain.com" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tembusan (CC)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                    {emailCcSettings.map((s, i) => (
                      <label key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedCc.includes(s['Nama Template'])} onChange={() => toggleCc(s['Nama Template'])} />
                        {s['Nama Template']}
                      </label>
                    ))}
                  </div>
                  <input className="form-input" value={customCc} onChange={e => setCustomCc(e.target.value)} placeholder="Tambahan CC (pisahkan koma)" />
                </div>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div className="card-title" style={{ fontSize: '14px', color: '#6338f0' }}>3. Data Akad & Plafond</div>
                
                <div className="flex-row" style={{ marginBottom: '16px' }}>
                  <div className="form-group flex-1">
                    <label className="form-label">Format Penulisan</label>
                    <select className="form-select" value={formatLaporan} onChange={e => setFormatLaporan(e.target.value)}>
                      <option>Vertikal Ke Bawah (Komplit)</option>
                      <option>Satu Baris (Simpel)</option>
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Pecah Top Up?</label>
                    <select className="form-select" value={modePlafond} onChange={e => setModePlafond(e.target.value)}>
                      <option>Standar (1 Baris)</option>
                      <option>Pecah Take Over + Top Up (3 Baris)</option>
                    </select>
                  </div>
                </div>

                <div className="flex-row" style={{ marginBottom: '12px' }}>
                  <div className="form-group flex-1">
                    <label className="form-label">Nama Nasabah</label>
                    <input className="form-input" value={namaDebitur} onChange={e=>setNamaDebitur(e.target.value)}/>
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Tgl Akad</label>
                    <input className="form-input" value={tanggalAkad} onChange={e=>setTanggalAkad(e.target.value)}/>
                  </div>
                </div>

                {modePlafond === 'Standar (1 Baris)' ? (
                  <div className="flex-row" style={{ marginBottom: '12px' }}>
                    <div className="form-group flex-1">
                      <label className="form-label">Product KPR</label>
                      <input className="form-input" value={produkKpr} onChange={e=>setProdukKpr(e.target.value)} />
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-label">Total Plafond</label>
                      <input className="form-input" value={plafondStandar} onChange={e=>setPlafondStandar(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-row" style={{ marginBottom: '12px' }}>
                    <div className="form-group flex-1">
                      <label className="form-label">Product KPR</label>
                      <input className="form-input" value={produkKpr} onChange={e=>setProdukKpr(e.target.value)} />
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-label">Nominal Top Up (Dari Total: {selectedLead.plafond})</label>
                      <input className="form-input" value={topUpVal} onChange={e=>setTopUpVal(e.target.value)} placeholder="Ketik angka top up saja" />
                    </div>
                  </div>
                )}

                {/* Bank Specific Tweaks */}
                {bankTujuan === 'UOB' && (
                  <div className="flex-row" style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nama Sales UOB</label>
                      <input className="form-input" value={uobSalesName} onChange={e=>setUobSalesName(e.target.value)} />
                    </div>
                    <div className="form-group flex-1" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                      <label style={{ fontSize: '13px' }}><input type="checkbox" checked={uobKomisiPaid} onChange={e=>setUobKomisiPaid(e.target.checked)} /> Komisi Paid to 99</label>
                    </div>
                  </div>
                )}
                {bankTujuan === 'Permata' && (
                  <div className="flex-row" style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                    <div className="form-group flex-1" style={{ marginBottom: 0, display: 'flex', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px' }}><input type="checkbox" checked={permataDiskon} onChange={e=>setPermataDiskon(e.target.checked)} /> Permohonan Diskon Provisi?</label>
                    </div>
                    {permataDiskon && (
                      <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                        <label className="form-label">Jadi Berapa Persen?</label>
                        <input className="form-input" value={permataPersen} onChange={e=>setPermataPersen(e.target.value)} placeholder="Misal: 0.5%" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div className="card-title" style={{ fontSize: '14px', color: '#6338f0' }}>4. Konfirmasi Email</div>
                <div className="flex-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Salam Pembuka</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select className="form-select" value={waktuSalam} onChange={e => setWaktuSalam(e.target.value)} style={{ width: '40%' }}>
                        <option>Selamat pagi</option><option>Selamat siang</option><option>Selamat sore</option><option>Tanpa Salam</option>
                      </select>
                      <select className="form-select" value={panggilan} onChange={e => setPanggilan(e.target.value)} style={{ width: '30%' }}>
                        <option>Bapak</option><option>Ibu</option><option>Tanpa Panggilan</option>
                      </select>
                      <input className="form-input" style={{ width: '30%' }} value={namaPenerima} onChange={e => setNamaPenerima(e.target.value)} placeholder="Nama" />
                    </div>
                  </div>
                </div>

                <div className="flex-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Template Paragraf Komisi</label>
                    <select className="form-select" value={komisiPreset} onChange={handleKomisiChange} style={{ marginBottom: '8px' }}>
                      <option>Template Utama (Bullet Point Rapi)</option><option>Kosong / Ketik Manual</option>
                      {komisiSettings.map((s, i) => <option key={i} value={s['Nama Template']}>{s['Nama Template']}</option>)}
                    </select>
                    <textarea className="form-textarea" rows="2" value={komisiText} onChange={e=>setKomisiText(e.target.value)} />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* RIGHT COLUMN: STICKY PREVIEW */}
        <div>
          <div style={{ position: 'sticky', top: '24px' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ background: '#f9fafb', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center' }}>
                  Live Email Preview
                </h3>
              </div>
              
              {!selectedLead ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  Pilih transaksi di sebelah kiri untuk melihat draf email.
                </div>
              ) : (
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Subject:</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                      {previewSubject || '(Subject akan terisi otomatis)'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px', marginBottom: '24px', fontSize: '13px' }}>
                    <div style={{ color: '#6b7280', textAlign: 'right' }}>To:</div>
                    <div style={{ color: '#111827' }}>{emailTo || <span style={{ color: '#ef4444' }}>Belum diisi</span>}</div>
                    
                    <div style={{ color: '#6b7280', textAlign: 'right' }}>From:</div>
                    <div style={{ color: '#111827' }}>{emailFrom}</div>
                    
                    {finalCc && (
                      <>
                        <div style={{ color: '#6b7280', textAlign: 'right' }}>Cc:</div>
                        <div style={{ color: '#111827' }}>{finalCc}</div>
                      </>
                    )}
                  </div>
                  
                  <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '0 -20px 20px -20px' }} />
                  
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'sans-serif', 
                    fontSize: '14px', 
                    lineHeight: '1.6',
                    color: '#374151',
                    minHeight: '200px'
                  }}>
                    {previewBody}
                  </div>

                  <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleCopyEmail}
                      style={{ fontSize: '14px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flex: '0 0 auto', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}
                      title="Salin isi email ke clipboard"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      Copy Teks
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleSend} 
                      disabled={sending || !emailTo} 
                      style={{ fontSize: '15px', padding: '12px 24px', flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    >
                      {sending ? 'Memproses...' : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                          Buka Draft di Gmail
                        </>
                      )}
                    </button>
                  </div>
                  {!emailTo && (
                    <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                      Tujuan (To) wajib diisi sebelum mengirim.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
