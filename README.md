# KPR Sheet Automation

Tools internal sederhana berbasis Streamlit untuk:
- menarik data transaksi akad KPR dari Google Sheets utama,
- membuat draft email konfirmasi akad ke bank,
- mencatat event log aktivitas tim,
- menyimpan preset email dan template paragraf.

Project ini sengaja dipertahankan tetap kecil:
- backend tetap Google Sheets,
- frontend tetap Streamlit,
- tanpa database tambahan,
- tanpa framework tambahan.

## 1. Dependency

Install dependency:

```powershell
pip install -r requirements.txt
```

## 2. Konfigurasi Secrets

### Opsi A - Local development

1. Copy file contoh:

```powershell
Copy-Item .streamlit\secrets.toml.example .streamlit\secrets.toml
```

2. Isi:
- `app_password`
- `main_spreadsheet_id`
- `log_spreadsheet_id`
- blok `[gcp_service_account]`

Catatan:
- Jangan commit `.streamlit/secrets.toml`.
- Service account harus diberi akses ke dua spreadsheet yang dipakai aplikasi.
- Jika key service account lama pernah tersimpan di repo/folder bersama, rotate key tersebut di GCP lalu pakai key baru.

### Opsi B - Environment variable

Alternatif tanpa file lokal:

- `MAIN_SPREADSHEET_ID`
- `LOG_SPREADSHEET_ID`
- `GCP_SERVICE_ACCOUNT_JSON`
- `APP_PASSWORD`

`GCP_SERVICE_ACCOUNT_JSON` harus berupa JSON service account utuh dalam satu environment variable.

## 3. Menjalankan Aplikasi

```powershell
streamlit run app.py
```

## 4. Perubahan Penting pada Versi Ini

- Secret produksi tidak lagi bergantung pada file JSON yang dibagikan di source tree.
- App sekarang mendukung password internal ringan untuk deployment berbasis URL.
- Pemilihan transaksi sekarang memakai identifier unik berbasis `Transaction ID` sheet atau fallback `ROW-<nomor_baris>`.
- Logging sekarang bersifat event-based dan append-only.
- Status log dibedakan antara:
  - `Draft Generated`
  - `Sent Confirmed (Manual)`
- Input email dan nominal `Top Up` sekarang divalidasi.
- Error handling untuk akses Google Sheets dibuat lebih jelas.

## 5. Struktur Google Sheets

### Sheet utama

Worksheet utama default:

- `All - Akad Transaction`

Kolom minimum yang harus tetap bisa dikenali:
- nama debitur
- plafond
- produk
- bank
- tanggal akad

App masih mencoba membaca variasi nama kolom yang mirip, tetapi perubahan header besar tetap sebaiknya dihindari.

### Sheet log / pengaturan

Spreadsheet log default berisi dua worksheet:
- `Log`
- `Pengaturan`

App akan membuat worksheet tersebut otomatis jika belum ada.

## 6. Deploy ke Streamlit Cloud

1. Push project ke repository Git.
2. Pastikan file sensitif tidak ikut ter-push:
   - `.streamlit/secrets.toml`
   - file JSON service account
3. Di Streamlit Cloud, buat app baru dari repo ini.
4. Isi `App secrets` dengan isi yang setara dengan `.streamlit/secrets.toml.example`, tetapi memakai value asli.
5. Deploy.

### Contoh format App Secrets di Streamlit Cloud

```toml
main_spreadsheet_id = "YOUR_MAIN_SPREADSHEET_ID"
log_spreadsheet_id = "YOUR_LOG_SPREADSHEET_ID"
app_password = "CHANGE-ME-INTERNAL"

[gcp_service_account]
type = "service_account"
project_id = "your-project-id"
private_key_id = "your-private-key-id"
private_key = "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
client_email = "your-service-account@your-project.iam.gserviceaccount.com"
client_id = "your-client-id"
auth_uri = "https://accounts.google.com/o/oauth2/auth"
token_uri = "https://oauth2.googleapis.com/token"
auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
client_x509_cert_url = "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
universe_domain = "googleapis.com"
```

## 7. Checklist Operasional Setelah Deploy

- Pastikan service account punya akses ke spreadsheet utama.
- Pastikan service account punya akses ke spreadsheet log/pengaturan.
- Pastikan `app_password` diset untuk deployment yang dibuka lewat URL.
- Coba buat satu draft email.
- Cek apakah log `Draft Generated` masuk.
- Coba tombol `Tandai Sudah Dikirim (Manual)`.
- Cek apakah log `Sent Confirmed (Manual)` masuk.

## 8. Catatan Maintenance

- Jangan ubah struktur log menjadi editable dari UI jika tujuan utamanya adalah histori.
- Kalau butuh cleanup log, lebih aman lakukan langsung di Google Sheets oleh owner internal.
- Kalau header sheet utama berubah, update mapping kolom di `app.py`.
