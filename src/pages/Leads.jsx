import React, { useEffect, useState } from 'react';
import Select from 'react-select';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Mode Selection: 'single' | 'batch'
  const [modeSelect, setModeSelect] = useState('single');

  // Single Mode State
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);

  // Salam & Penerima
  const [waktuSalam, setWaktuSalam] = useState('Selamat pagi');
  const [panggilan, setPanggilan] = useState('Bapak');
  const [namaPenerima, setNamaPenerima] = useState('');
  const [bankTujuan, setBankTujuan] = useState('');

  // Pengaturan Email
  const [ddTo, setDdTo] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [ddFrom, setDdFrom] = useState('akun.kantor@99.co');
  const [emailFrom, setEmailFrom] = useState('akun.kantor@99.co');
  const [selectedCc, setSelectedCc] = useState([]);
  const [customCc, setCustomCc] = useState('');

  // Tinjauan Data Otomatis
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

  // Komisi & Penutup
  const [komisiPreset, setKomisiPreset] = useState('Template Utama (Bullet Point Rapi)');
  const [komisiText, setKomisiText] = useState('');
  const [penutupPreset, setPenutupPreset] = useState('Template Standar');
  const [penutupText, setPenutupText] = useState('');

  // Batch Mode State
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchBankFilter, setBatchBankFilter] = useState('');
  const [batchFormatBtnMap, setBatchFormatBtnMap] = useState({}); // bankKey -> 'sp3k' | 'normal'

  const fetchData = () => {
    setLoading(true);
    const headers = { 'Authorization': 'Bearer ' + localStorage.getItem('kpr_auth_token') };
    Promise.all([
      fetch('/api/leads', { headers }).then(res => {
        if (res.status === 401) {
          localStorage.removeItem('kpr_auth_token');
          window.location.reload();
        }
        return res.json();
      }),
      fetch('/api/settings', { headers }).then(res => res.json())
    ]).then(([leadsData, settingsData]) => {
      if (leadsData && leadsData.status === 'success') setLeads(leadsData.data);
      if (settingsData && settingsData.status === 'success') setSettings(settingsData.data);
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

  const findMatchingBankEmail = (bankName) => {
    if (!bankName) return { name: '-- Ketik Manual / Kosongkan --', email: '' };
    const bankKeyword = bankName.toLowerCase().split(' ')[0];
    const matching = emailBankSettings.filter(s => {
      const label = s['Nama Template'].toLowerCase();
      const isi = s['Isi Template'].toLowerCase();
      return label.includes(bankKeyword) || isi.includes(bankKeyword);
    });
    if (matching.length > 0) {
      return { name: matching[0]['Nama Template'], email: matching[0]['Isi Template'] };
    }
    return { name: '-- Ketik Manual / Kosongkan --', email: '' };
  };

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
      
      const isBtn = lead.bank.toUpperCase().includes('BTN');
      if (isBtn) {
        setFormatLaporan('Format SP3K (Khusus BTN)');
      } else {
        setFormatLaporan('Vertikal Ke Bawah (Komplit)');
      }

      const match = findMatchingBankEmail(lead.bank);
      setDdTo(match.name);
      setEmailTo(match.email);

      setKomisiPreset('Template Utama (Bullet Point Rapi)');
      updateKomisiText('Template Utama (Bullet Point Rapi)');
      
      let defaultPenutup = 'Template Standar';
      if (isBtn) {
        defaultPenutup = 'Template Otomatis Bank BTN';
      } else if (['Permata', 'UOB', 'CIMB Syariah'].includes(lead.bank)) {
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
    } else if (preset === `Template Otomatis Bank ${bank}` || preset === 'Template Otomatis Bank BTN') {
      if (bank && bank.toUpperCase().includes('BTN')) {
        setPenutupText("Mohon dibantu konfirmasi apabila SP3K Dan Transaksi tersebut sudah benar. Terima kasih.");
      } else if (bank === 'Permata') {
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

  // Generate Email for Single Lead
  const generateEmailBody = () => {
    if (!selectedLead) return { subject: '', body: '', plafondLog: '' };

    const platform = selectedLead.platform || 'Rumah123';
    const isSp3kBtn = formatLaporan === 'Format SP3K (Khusus BTN)';
    
    let subjek = isSp3kBtn
      ? `Konfirmasi plafond akad dan SP3K ${platform} - ${bankTujuan}`
      : `Konfirmasi plafond akad ${platform} - ${bankTujuan}`;
    
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
    if (isSp3kBtn) {
      detailData = `Nama Debitur : ${namaDebitur}`;
    } else if (formatLaporan === 'Satu Baris (Simpel)') {
      detailData = `1. ${namaDebitur}   ${tanggalAkad}   - ${plafondLog}`;
      if (noteBank) detailData += ` (${noteBank})`;
    } else {
      detailData = `Nama Debitur : ${namaDebitur}\n${stringPlafondEmail}\nProduct      : ${produkKpr}\nTgl Akad     : ${tanggalAkad}`;
      if (bankTujuan === 'UOB' && uobSalesName) {
        detailData += `\nSales        : ${uobSalesName}\nKomisi       : 1% dari Plafond`;
      }
    }

    let penutupFinal = penutupText.trim();
    if (!isSp3kBtn && komisiText.trim() && !penutupFinal.includes(komisiText.trim())) {
      penutupFinal += `\n\n${komisiText.trim()}`;
    }

    const body = `${salam}${pengantar}\n\n${detailData}\n\n${penutupFinal}`;
    return { subject: subjek, body, plafondLog };
  };

  const handleSend = () => {
    if (formatLaporan !== 'Format SP3K (Khusus BTN)' && !tanggalAkad.trim()) {
      return alert("Tanggal akad wajib diisi.");
    }
    if (modePlafond === 'Pecah Take Over + Top Up (3 Baris)') {
      if (parseNumeric(topUpVal) > parseNumeric(selectedLead.plafond)) {
        return alert("Nominal Top Up tidak boleh lebih besar dari total plafond.");
      }
    }

    const { subject, body, plafondLog } = generateEmailBody();
    let finalCc = [...selectedCc];
    if (customCc) finalCc = finalCc.concat(customCc.split(',').map(s => s.trim()).filter(s => s));

    // 1. Save Log
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

  // -------------------------------------------------------------
  // BATCH MODE LOGIC
  // -------------------------------------------------------------
  const uniqueBanks = Array.from(new Set(leads.map(l => l.bank).filter(Boolean)));

  const filteredBatchLeads = leads.filter(lead => {
    const matchesSearch = batchSearch === '' || 
      lead.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
      lead.bank.toLowerCase().includes(batchSearch.toLowerCase()) ||
      (lead.date && lead.date.toLowerCase().includes(batchSearch.toLowerCase()));
    const matchesBank = batchBankFilter === '' || lead.bank === batchBankFilter;
    return matchesSearch && matchesBank;
  });

  const toggleBatchLead = (leadId) => {
    if (selectedBatchIds.includes(leadId)) {
      setSelectedBatchIds(selectedBatchIds.filter(id => id !== leadId));
    } else {
      setSelectedBatchIds([...selectedBatchIds, leadId]);
    }
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredBatchLeads.map(l => l.id);
    const allSelected = visibleIds.every(id => selectedBatchIds.includes(id));
    if (allSelected) {
      setSelectedBatchIds(selectedBatchIds.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedBatchIds(Array.from(new Set([...selectedBatchIds, ...visibleIds])));
    }
  };

  // Compile Grouped Drafts
  const selectedBatchLeads = leads.filter(l => selectedBatchIds.includes(l.id));
  const batchGroups = {};
  selectedBatchLeads.forEach(lead => {
    const b = lead.bank || 'Lainnya';
    if (!batchGroups[b]) batchGroups[b] = [];
    batchGroups[b].push(lead);
  });

  const generateBatchEmailForGroup = (bankName, groupLeads) => {
    const isBtn = bankName.toUpperCase().includes('BTN');
    const chosenFormat = batchFormatBtnMap[bankName] || (isBtn ? 'sp3k' : 'normal');
    const platform = groupLeads[0]?.platform || 'Rumah123';
    
    let subject = (isBtn && chosenFormat === 'sp3k')
      ? `Konfirmasi plafond akad dan SP3K ${platform} - ${bankName}`
      : `Konfirmasi plafond akad ${platform} - ${bankName}`;

    let salam = waktuSalam !== 'Tanpa Salam' ? `${waktuSalam},\n\n` : '';
    let pengantar = `Di bawah ini adalah transaksi leads KPR referral ${platform} yang sudah akad di Bank ${bankName}:`;

    let detailData = '';
    if (isBtn && chosenFormat === 'sp3k') {
      detailData = groupLeads.map(l => `Nama Debitur : ${l.name}`).join('\n\n');
    } else {
      detailData = groupLeads.map((l, i) => `${i + 1}. ${l.name}   ${l.date || '-'}   - ${l.plafond || '-'}`).join('\n');
    }

    let penutup = (isBtn && chosenFormat === 'sp3k')
      ? 'Mohon dibantu konfirmasi apabila SP3K Dan Transaksi tersebut sudah benar. Terima kasih.'
      : 'Mohon dibantu konfirmasi apabila transaksi tersebut sudah benar. Terima kasih.';

    const body = `${salam}${pengantar}\n\n${detailData}\n\n${penutup}`;
    const match = findMatchingBankEmail(bankName);

    return {
      bankName,
      subject,
      body,
      to: match.email,
      from: emailFrom,
      leads: groupLeads,
      isBtn,
      chosenFormat
    };
  };

  const handleOpenSingleBatchDraft = (draft) => {
    let finalCc = [...selectedCc];
    if (customCc) finalCc = finalCc.concat(customCc.split(',').map(s => s.trim()).filter(s => s));

    // Save logs for each lead in group
    draft.leads.forEach(lead => {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('kpr_auth_token')
        },
        body: JSON.stringify({
          transaction_id: lead.id,
          source_row: lead.row_number,
          nama: lead.name,
          bank: lead.bank,
          plafond: lead.plafond,
          email_to: draft.to,
          pic_pengirim: draft.from,
          platform: lead.platform,
          status: 'Batch Draft Generated',
          catatan: 'Draft dibuka via Batch Gmail',
          isi_email: draft.body
        })
      }).catch(err => console.error('Error saving batch log:', err));
    });

    const gmailUrl = new URL('https://mail.google.com/mail/?view=cm&fs=1');
    if (draft.to) gmailUrl.searchParams.append('to', draft.to);
    if (finalCc.length > 0) gmailUrl.searchParams.append('cc', finalCc.join(', '));
    gmailUrl.searchParams.append('su', draft.subject);
    gmailUrl.searchParams.append('body', draft.body);
    if (draft.from) gmailUrl.searchParams.append('authuser', draft.from);

    window.open(gmailUrl.toString(), '_blank');
  };

  const handleOpenAllBatchDrafts = () => {
    const bankKeys = Object.keys(batchGroups);
    if (bankKeys.length === 0) return;

    if (bankKeys.length > 3) {
      const confirmOpen = window.confirm(`Sistem akan membuka ${bankKeys.length} tab Gmail sekaligus. Pastikan browser tidak memblokir Pop-up ya! Lanjutkan?`);
      if (!confirmOpen) return;
    }

    bankKeys.forEach((bankName, index) => {
      setTimeout(() => {
        const draft = generateBatchEmailForGroup(bankName, batchGroups[bankName]);
        handleOpenSingleBatchDraft(draft);
      }, index * 400); // slight delay to avoid browser popup blocks
    });
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Email Generator</h1>
          <p className="page-description">Generate draft email konfirmasi akad (Single & Batch) langsung via Gmail.</p>
        </div>
        
        {/* MODE SWITCHER PILL */}
        <div style={{ 
          display: 'flex', 
          background: '#e0e7ff', 
          padding: '4px', 
          borderRadius: '10px',
          border: '1px solid #c7d2fe'
        }}>
          <button 
            onClick={() => setModeSelect('single')}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
              background: modeSelect === 'single' ? '#2b70f0' : 'transparent',
              color: modeSelect === 'single' ? 'white' : '#1e3a8a',
              transition: 'all 0.2s'
            }}
          >
            👤 Mode Single (1 Nasabah)
          </button>
          <button 
            onClick={() => setModeSelect('batch')}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
              background: modeSelect === 'batch' ? '#2b70f0' : 'transparent',
              color: modeSelect === 'batch' ? 'white' : '#1e3a8a',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>📑 Mode Batch (Multi-Centang)</span>
            {selectedBatchIds.length > 0 && (
              <span style={{ 
                background: modeSelect === 'batch' ? 'white' : '#2b70f0', 
                color: modeSelect === 'batch' ? '#2b70f0' : 'white', 
                padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' 
              }}>
                {selectedBatchIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: CONTROLS & SELECTION */}
        {/* ======================================================== */}
        <div>
          {modeSelect === 'single' ? (
            /* SINGLE MODE CONTROLS */
            <>
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="card-title" style={{ fontSize: '14px', color: '#2b70f0', margin: 0 }}>1. Pilih Transaksi</div>
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
                        borderColor: '#2b70f0'
                      }
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#2b70f0' : state.isFocused ? '#eff6ff' : 'white',
                      color: state.isSelected ? 'white' : '#1a1a24'
                    })
                  }}
                />
              </div>

              {selectedLead && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                  
                  {/* Kontak & Tujuan Email */}
                  <div className="card" style={{ padding: '20px' }}>
                    <div className="card-title" style={{ fontSize: '14px', color: '#2b70f0' }}>2. Kontak & Tujuan Email</div>
                    
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

                  {/* Data Akad & Plafond */}
                  <div className="card" style={{ padding: '20px' }}>
                    <div className="card-title" style={{ fontSize: '14px', color: '#2b70f0' }}>3. Data Akad & Format</div>
                    
                    <div className="flex-row" style={{ marginBottom: '16px' }}>
                      <div className="form-group flex-1">
                        <label className="form-label">Format Penulisan</label>
                        <select className="form-select" value={formatLaporan} onChange={e => setFormatLaporan(e.target.value)}>
                          <option>Vertikal Ke Bawah (Komplit)</option>
                          <option>Satu Baris (Simpel)</option>
                          <option>Format SP3K (Khusus BTN)</option>
                        </select>
                      </div>
                      {formatLaporan !== 'Format SP3K (Khusus BTN)' && (
                        <div className="form-group flex-1">
                          <label className="form-label">Pecah Top Up?</label>
                          <select className="form-select" value={modePlafond} onChange={e => setModePlafond(e.target.value)}>
                            <option>Standar (1 Baris)</option>
                            <option>Pecah Take Over + Top Up (3 Baris)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {formatLaporan === 'Format SP3K (Khusus BTN)' ? (
                      <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8', marginBottom: '4px' }}>
                          ⚡ Format Khusus SP3K Bank BTN Aktif
                        </div>
                        <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                          Hanya menampilkan Nama Debitur tanpa rincian nominal plafond. Lampirkan file PDF SP3K langsung di tab Gmail.
                        </div>
                        <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                          <label className="form-label">Nama Debitur</label>
                          <input className="form-input" value={namaDebitur} onChange={e=>setNamaDebitur(e.target.value)}/>
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
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

                  {/* Konfirmasi Email */}
                  <div className="card" style={{ padding: '20px' }}>
                    <div className="card-title" style={{ fontSize: '14px', color: '#2b70f0' }}>4. Salam & Penutup</div>
                    <div className="flex-row" style={{ marginBottom: '16px' }}>
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

                    {formatLaporan !== 'Format SP3K (Khusus BTN)' && (
                      <div className="flex-row" style={{ marginBottom: '16px' }}>
                        <div className="form-group flex-1">
                          <label className="form-label">Template Paragraf Komisi</label>
                          <select className="form-select" value={komisiPreset} onChange={handleKomisiChange} style={{ marginBottom: '8px' }}>
                            <option>Template Utama (Bullet Point Rapi)</option><option>Kosong / Ketik Manual</option>
                            {komisiSettings.map((s, i) => <option key={i} value={s['Nama Template']}>{s['Nama Template']}</option>)}
                          </select>
                          <textarea className="form-textarea" rows="2" value={komisiText} onChange={e=>setKomisiText(e.target.value)} />
                        </div>
                      </div>
                    )}

                    <div className="flex-row">
                      <div className="form-group flex-1">
                        <label className="form-label">Kalimat Penutup</label>
                        <select className="form-select" value={penutupPreset} onChange={handlePenutupChange} style={{ marginBottom: '8px' }}>
                          <option>Template Standar</option>
                          <option>Template Otomatis Bank BTN</option>
                          <option>Kosong / Ketik Manual</option>
                          {penutupSettings.map((s, i) => <option key={i} value={s['Nama Template']}>{s['Nama Template']}</option>)}
                        </select>
                        <textarea className="form-textarea" rows="2" value={penutupText} onChange={e=>setPenutupText(e.target.value)} />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </>
          ) : (
            /* BATCH MODE CONTROLS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div className="card-title" style={{ fontSize: '15px', color: '#2b70f0', margin: 0 }}>
                    Pilih Nasabah (Centang)
                  </div>
                  <button 
                    onClick={fetchData} 
                    style={{ 
                      background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', 
                      display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500' 
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.27l-3.27-3.27"/></svg>
                    Sync Data
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  <input 
                    className="form-input" 
                    placeholder="Cari nama nasabah atau tanggal..." 
                    value={batchSearch}
                    onChange={e => setBatchSearch(e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <select 
                    className="form-select" 
                    value={batchBankFilter} 
                    onChange={e => setBatchBankFilter(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Semua Bank</option>
                    {uniqueBanks.map((b, i) => <option key={i} value={b}>{b}</option>)}
                  </select>
                </div>

                {/* Batch Action Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '13px' }}>
                  <button 
                    onClick={handleSelectAllVisible}
                    style={{ 
                      background: '#f3f4f6', border: '1px solid #d1d5db', padding: '6px 12px', 
                      borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#374151' 
                    }}
                  >
                    {filteredBatchLeads.length > 0 && filteredBatchLeads.every(l => selectedBatchIds.includes(l.id))
                      ? 'Batalkan Semua'
                      : `Pilih Semua (${filteredBatchLeads.length})`}
                  </button>

                  <div style={{ fontWeight: '600', color: selectedBatchIds.length > 0 ? '#2b70f0' : '#9ca3af' }}>
                    {selectedBatchIds.length} nasabah dipilih
                  </div>
                </div>

                {/* Scrollable Leads List */}
                <div style={{ 
                  maxHeight: '480px', 
                  overflowY: 'auto', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  background: '#fafafa'
                }}>
                  {filteredBatchLeads.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                      Tidak ada transaksi yang cocok.
                    </div>
                  ) : (
                    filteredBatchLeads.map((lead) => {
                      const isSelected = selectedBatchIds.includes(lead.id);
                      const isBtn = lead.bank.toUpperCase().includes('BTN');
                      return (
                        <div 
                          key={lead.id}
                          onClick={() => toggleBatchLead(lead.id)}
                          style={{
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderBottom: '1px solid #f3f4f6',
                            background: isSelected ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                                {lead.name}
                              </span>
                              <span style={{ 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontWeight: 'bold',
                                background: isBtn ? '#dbeafe' : '#f3f4f6',
                                color: isBtn ? '#1d4ed8' : '#4b5563',
                                border: isBtn ? '1px solid #bfdbfe' : '1px solid #e5e7eb'
                              }}>
                                {lead.bank}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Akad: {lead.date || '-'} &bull; Plafond: {lead.plafond || '-'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* Salam Global for Batch */}
              <div className="card" style={{ padding: '20px' }}>
                <div className="card-title" style={{ fontSize: '14px', color: '#2b70f0', marginBottom: '12px' }}>
                  Format Salam Pembuka (Semua Draft)
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select className="form-select" value={waktuSalam} onChange={e => setWaktuSalam(e.target.value)} style={{ flex: 1 }}>
                    <option>Selamat pagi</option>
                    <option>Selamat siang</option>
                    <option>Selamat sore</option>
                    <option>Tanpa Salam</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: PREVIEW & LAUNCHER */}
        {/* ======================================================== */}
        <div>
          {modeSelect === 'single' ? (
            /* SINGLE MODE LIVE PREVIEW */
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
                        style={{ fontSize: '15px', padding: '12px 24px', flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#2b70f0' }}
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
          ) : (
            /* BATCH MODE PREVIEWS & ACTIONS */
            <div>
              <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb', 
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                    Antrean Draf Batch ({Object.keys(batchGroups).length} Bank)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                    {selectedBatchIds.length} nasabah dikelompokkan berdasarkan Bank tujuan.
                  </p>
                </div>

                {Object.keys(batchGroups).length > 0 && (
                  <button 
                    onClick={handleOpenAllBatchDrafts}
                    style={{
                      background: '#2b70f0',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(43, 112, 240, 0.2)'
                    }}
                  >
                    <span>🚀 Buka Semua ({Object.keys(batchGroups).length} Tab)</span>
                  </button>
                )}
              </div>

              {Object.keys(batchGroups).length === 0 ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  Belum ada nasabah yang dicentang di sebelah kiri.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {Object.keys(batchGroups).map((bankName) => {
                    const groupLeads = batchGroups[bankName];
                    const draft = generateBatchEmailForGroup(bankName, groupLeads);

                    return (
                      <div key={bankName} className="card" style={{ padding: '20px', border: '1px solid #e5e7eb' }}>
                        {/* Header Group */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ 
                              background: '#2b70f0', color: 'white', 
                              padding: '4px 10px', borderRadius: '6px', 
                              fontWeight: 'bold', fontSize: '13px' 
                            }}>
                              Bank {bankName}
                            </span>
                            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                              {groupLeads.length} nasabah
                            </span>
                          </div>

                          {/* If BTN, toggle between SP3K and Normal */}
                          {draft.isBtn && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                              <span style={{ color: '#4b5563' }}>Format:</span>
                              <select 
                                value={draft.chosenFormat}
                                onChange={(e) => setBatchFormatBtnMap({ ...batchFormatBtnMap, [bankName]: e.target.value })}
                                style={{ 
                                  fontSize: '12px', padding: '4px 8px', borderRadius: '6px', 
                                  border: '1px solid #d1d5db', background: '#eff6ff', color: '#1d4ed8', fontWeight: '600' 
                                }}
                              >
                                <option value="sp3k">Format SP3K</option>
                                <option value="normal">Format Normal (Plafond)</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div style={{ fontSize: '13px', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px' }}>
                          <div style={{ marginBottom: '4px' }}>
                            <strong style={{ color: '#4b5563' }}>Subject:</strong> {draft.subject}
                          </div>
                          <div>
                            <strong style={{ color: '#4b5563' }}>To:</strong> {draft.to || <span style={{ color: '#ef4444' }}>Belum diatur di Pengaturan</span>}
                          </div>
                        </div>

                        {/* Body Preview */}
                        <div style={{ 
                          whiteSpace: 'pre-wrap', 
                          fontFamily: 'sans-serif', 
                          fontSize: '13px', 
                          lineHeight: '1.6', 
                          color: '#374151',
                          background: '#fff',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          border: '1px solid #f3f4f6',
                          maxHeight: '220px',
                          overflowY: 'auto'
                        }}>
                          {draft.body}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(draft.body);
                              alert(`Teks email Bank ${bankName} berhasil disalin!`);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '13px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            Copy Teks
                          </button>

                          <button 
                            onClick={() => handleOpenSingleBatchDraft(draft)}
                            disabled={!draft.to}
                            style={{ 
                              background: draft.to ? '#2b70f0' : '#9ca3af',
                              color: 'white', border: 'none', 
                              borderRadius: '6px', padding: '8px 18px', 
                              fontSize: '13px', fontWeight: '600', 
                              cursor: draft.to ? 'pointer' : 'not-allowed',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            Buka Draft di Gmail
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
