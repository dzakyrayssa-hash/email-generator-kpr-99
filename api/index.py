import json
import os
import re
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import gspread
import pandas as pd
from google.oauth2.service_account import Credentials
import urllib.parse
# For Gmail API (Future iteration for direct sending)
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="KPR Sheet Automation API")

# Allow CORS for local development (Vite runs on different port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Constants
DEFAULT_MAIN_SPREADSHEET_ID = "1ahgBUNp3m0tWXVAnQjDmbMZexP05VI36bmE0xjTqNE8"
DEFAULT_LOG_SPREADSHEET_ID = "14OdBvhcGlmaC1hcn7t0WAP-u2MciEbRN-N39a1HCaKM"
MAIN_WORKSHEET_NAME = "All - Akad Transaction"
LOG_WORKSHEET_NAME = "Log"
SETTINGS_WORKSHEET_NAME = "Pengaturan"

SETTINGS_COLUMNS = ["Kategori", "Nama Template", "Isi Template"]
LOG_COLUMNS = [
    "Waktu Proses",
    "Nama Debitur",
    "Bank Tujuan",
    "Plafond Kredit",
    "Email Tujuan (To)",
    "PIC Pengirim",
    "Platform",
    "Transaction ID",
    "Sumber Baris",
    "Status",
    "Catatan",
    "Isi Email",
]

# Hardcoded Mappings for now (Can be moved to settings later)
ENTITY_PLATFORM_MAP = {
    "NND": "99.co (Rumah123)",
    "WMI": "Rumah123",
}
ENTITY_DISPLAY_MAP = {
    "NND": "NND (99.co - Rumah123)",
    "WMI": "WMI (Rumah123)",
}
AUTHORITATIVE_BANK_ENTITY_MAP = {
    "OCBC": "NND",
    "Sinarmas": "NND",
    "INA": "NND",
    "UOB": "NND",
    "Permata": "NND",
    "Maybank": "NND",
    "Danamon": "NND",
    "BSI Jawa Timur": "WMI",
    "Ganesha": "WMI",
    "BSI": "WMI",
    "Muamalat": "WMI",
    "CIMB Niaga": "WMI",
    "Mandiri": "WMI",
    "KB": "WMI",
    "CIMB Syariah": "WMI",
}
BANK_ENTITY_FALLBACK = {"Lainnya": "WMI"}
BANK_DISPLAY_ALIASES = {
    "CIMB": "CIMB Niaga",
    "BUKOPIN": "KB",
    "KB BUKOPIN": "KB",
    "OCBC NISP": "OCBC",
    "BSI JATIM": "BSI Jawa Timur",
}
EMAIL_BANK_KEYWORDS = {
    "OCBC": ["ocbc"],
    "Sinarmas": ["sinarmas"],
    "INA": ["ina"],
    "UOB": ["uob"],
    "Permata": ["permata"],
    "Maybank": ["maybank"],
    "Danamon": ["danamon"],
    "BSI Jawa Timur": ["bsi", "bankbsi", "bank_syariah_indonesia"],
    "Ganesha": ["ganesha"],
    "BSI": ["bsi", "bankbsi", "bank_syariah_indonesia"],
    "Muamalat": ["muamalat", "bankmuamalat"],
    "CIMB Niaga": ["cimbniaga", "cimb"],
    "Mandiri": ["mandiri"],
    "KB": ["kbbank", "kbbank.co", "bukopin", "kb"],
    "CIMB Syariah": ["cimbsyariah"],
}

# ----------------- Helper Functions ----------------- #

def get_config_value(env_key, default=None):
    env_value = os.getenv(env_key)
    if env_value is not None and env_value.strip():
        return env_value.strip()
    return default

def load_service_account_info():
    raw_json = os.getenv("GCP_SERVICE_ACCOUNT_JSON", "").strip()
    if raw_json:
        try:
            return json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Environment variable GCP_SERVICE_ACCOUNT_JSON tidak valid.") from exc
    
    raise RuntimeError("Kredensial Google belum tersedia di Environment Variables.")


def get_gspread_client():
    creds_dict = load_service_account_info()
    scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.send"]
    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    return gspread.authorize(creds)

def get_runtime_config():
    return {
        "main_spreadsheet_id": get_config_value("MAIN_SPREADSHEET_ID", DEFAULT_MAIN_SPREADSHEET_ID),
        "log_spreadsheet_id": get_config_value("LOG_SPREADSHEET_ID", DEFAULT_LOG_SPREADSHEET_ID),
    }

# Data Loading Utilities
def ensure_dataframe_columns(df, columns):
    if df.empty:
        return pd.DataFrame(columns=columns)
    normalized = df.copy()
    for column in columns:
        if column not in normalized.columns:
            normalized[column] = ""
    return normalized[columns]

def clean_text(value):
    if pd.isna(value):
        return ""
    return str(value).strip()

def find_first_matching_column(columns, exact_names=None, contains_keywords=None):
    exact_names = exact_names or []
    contains_keywords = contains_keywords or []
    lowered = {str(column).strip().lower(): column for column in columns}
    for name in exact_names:
        if name.lower() in lowered:
            return lowered[name.lower()]
    for column in columns:
        lower_column = str(column).strip().lower()
        if any(keyword in lower_column for keyword in contains_keywords):
            return column
    return None

def normalize_bank_name(bank_name):
    cleaned = clean_text(bank_name)
    if not cleaned:
        return ""
    upper_cleaned = cleaned.upper()
    for source_name, target_name in BANK_DISPLAY_ALIASES.items():
        if upper_cleaned == source_name.upper():
            return target_name
    return cleaned

def detect_entity_code(raw_text):
    text = clean_text(raw_text).upper()
    if "NND" in text:
        return "NND"
    if "WMI" in text:
        return "WMI"
    return ""

def extract_account_signature(raw_text):
    digits = "".join(ch for ch in clean_text(raw_text) if ch.isdigit())
    return digits

def build_bank_entity_map(df, bank_col, payment_account_col):
    mapping = dict(AUTHORITATIVE_BANK_ENTITY_MAP)
    if payment_account_col and payment_account_col in df.columns:
        account_entity_map = {}
        for _, row in df.iterrows():
            payment_text = clean_text(row.get(payment_account_col, ""))
            entity_code = detect_entity_code(payment_text)
            signature = extract_account_signature(payment_text)
            if entity_code and signature:
                account_entity_map[signature] = entity_code

        for _, row in df.iterrows():
            bank_name = normalize_bank_name(row.get(bank_col, ""))
            if not bank_name:
                continue
            payment_text = clean_text(row.get(payment_account_col, ""))
            entity_code = detect_entity_code(payment_text)
            if not entity_code:
                signature = extract_account_signature(payment_text)
                entity_code = account_entity_map.get(signature, "")
            if entity_code:
                mapping.setdefault(bank_name, entity_code)

    for bank_name, entity_code in BANK_ENTITY_FALLBACK.items():
        mapping.setdefault(bank_name, entity_code)
    return mapping

# ----------------- API Endpoints ----------------- #

from fastapi import Header

class AuthRequest(BaseModel):
    password: str

@app.post("/api/auth")
def authenticate(request: AuthRequest):
    configured_password = get_config_value("APP_PASSWORD", "")
    if not configured_password or request.password == configured_password:
        return {"status": "success", "token": request.password}
    raise HTTPException(status_code=401, detail="Password salah")

def verify_token(authorization: str = Header(None)):
    configured_password = get_config_value("APP_PASSWORD", "")
    if not configured_password:
        return True
    
    if authorization == f"Bearer {configured_password}":
        return True
    
    raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/api/config", dependencies=[Depends(verify_token)])
def get_config():
    config = get_runtime_config()
    return {"status": "success", "config": config}

@app.get("/api/leads", dependencies=[Depends(verify_token)])
def get_leads():
    try:
        config = get_runtime_config()
        client = get_gspread_client()
        sheet = client.open_by_key(config["main_spreadsheet_id"]).worksheet(MAIN_WORKSHEET_NAME)
        data = sheet.get_all_values()
        
        if not data:
            return {"status": "success", "data": []}
            
        headers = [str(header).strip() for header in data[0]]
        df = pd.DataFrame(data[1:], columns=headers)
        df.columns = df.columns.astype(str).str.strip()
        df["__sheet_row_number"] = range(2, len(df) + 2)
        
        # Parse data safely
        columns = df.columns.tolist()
        col_name = find_first_matching_column(columns, ["Customer Name", "Nama Debitur", "Name"], ["customer name", "nama", "name"])
        col_plafond = find_first_matching_column(columns, ["GMV \nPlafond / Disbursed Amount (IDR)", "Total Plafond"], ["plafond", "disbursed amount", "gmv"])
        col_product = find_first_matching_column(columns, ["Type", "Credit Facility", "Produk"], ["type", "facility", "produk"])
        col_bank = find_first_matching_column(columns, ["Bank disbursed", "Bank"], ["bank disbursed", "bank"])
        col_tanggal = find_first_matching_column(columns, ["Tanggal Akad", "Tanggal Akad Kredit"], ["tanggal akad"])
        col_payment_account = find_first_matching_column(columns, ["Payment\nR123 Account", "Payment R123 Account"], ["payment", "r123 account"])
        native_id_column = find_first_matching_column(columns, ["Transaction ID", "Lead ID", "ID Transaksi", "ID"], [])
        
        bank_entity_map = build_bank_entity_map(df, col_bank, col_payment_account)
        
        results = []
        for row_index, row_data in df.iterrows():
            name = clean_text(row_data.get(col_name, ""))
            if not name or "example" in name.lower():
                continue
                
            native_id = clean_text(row_data.get(native_id_column, "")) if native_id_column else ""
            transaction_id = f"TX-{native_id}" if native_id else f"ROW-{int(row_data['__sheet_row_number'])}"
            
            bank_name = normalize_bank_name(row_data.get(col_bank, ""))
            payment_account = clean_text(row_data.get(col_payment_account, "")) if col_payment_account else ""
            
            # Resolve entity logic
            entity_code = bank_entity_map.get(bank_name)
            if not entity_code:
                entity_code = detect_entity_code(payment_account) or "WMI"
                
            results.append({
                "id": transaction_id,
                "row_number": int(row_data["__sheet_row_number"]),
                "name": name,
                "date": clean_text(row_data.get(col_tanggal, "")),
                "bank": bank_name,
                "plafond": clean_text(row_data.get(col_plafond, "")),
                "product": clean_text(row_data.get(col_product, "")),
                "entity_code": entity_code,
                "platform": ENTITY_PLATFORM_MAP.get(entity_code, "Rumah123")
            })
            
        return {"status": "success", "data": results}
    except Exception as e:
        print(f"Error fetching leads: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs", dependencies=[Depends(verify_token)])
def get_logs():
    try:
        config = get_runtime_config()
        client = get_gspread_client()
        spreadsheet = client.open_by_key(config["log_spreadsheet_id"])
        ws = spreadsheet.worksheet(LOG_WORKSHEET_NAME)
        records = ws.get_all_records()
        return {"status": "success", "data": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class LogEvent(BaseModel):
    transaction_id: str
    source_row: int
    nama: str
    bank: str
    plafond: str
    email_to: str
    pic_pengirim: str
    platform: str
    status: str
    catatan: str = ""
    isi_email: str = ""

@app.post("/api/logs", dependencies=[Depends(verify_token)])
def append_log(event: LogEvent):
    try:
        config = get_runtime_config()
        client = get_gspread_client()
        spreadsheet = client.open_by_key(config["log_spreadsheet_id"])
        ws = spreadsheet.worksheet(LOG_WORKSHEET_NAME)
        
        row = [
            pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
            event.nama,
            event.bank,
            event.plafond,
            event.email_to or "Tidak diisi",
            event.pic_pengirim or "Tidak diisi",
            event.platform,
            event.transaction_id,
            event.source_row,
            event.status,
            event.catatan,
            event.isi_email
        ]
        ws.append_row(row, value_input_option="USER_ENTERED")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings", dependencies=[Depends(verify_token)])
def get_settings():
    try:
        config = get_runtime_config()
        client = get_gspread_client()
        spreadsheet = client.open_by_key(config["log_spreadsheet_id"])
        ws = spreadsheet.worksheet(SETTINGS_WORKSHEET_NAME)
        records = ws.get_all_records()
        for idx, record in enumerate(records):
            record["__sheet_row_number"] = idx + 2
        return {"status": "success", "data": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SettingEvent(BaseModel):
    kategori: str
    nama: str
    isi: str

@app.post("/api/settings", dependencies=[Depends(verify_token)])
def append_setting(setting: SettingEvent):
    try:
        config = get_runtime_config()
        client = get_gspread_client()
        spreadsheet = client.open_by_key(config["log_spreadsheet_id"])
        ws = spreadsheet.worksheet(SETTINGS_WORKSHEET_NAME)
        
        # Very basic validation handled via Pydantic
        row = [setting.kategori, setting.nama.strip(), setting.isi.strip()]
        ws.append_row(row, value_input_option="USER_ENTERED")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/settings/{row_number}", dependencies=[Depends(verify_token)])
def update_setting(row_number: int, setting: SettingEvent):
    try:
        config = get_runtime_config()
        client = get_gspread_client()
        spreadsheet = client.open_by_key(config["log_spreadsheet_id"])
        ws = spreadsheet.worksheet(SETTINGS_WORKSHEET_NAME)
        
        row_data = [setting.kategori, setting.nama.strip(), setting.isi.strip()]
        ws.update(f"A{row_number}:C{row_number}", [row_data])
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SendEmailRequest(BaseModel):
    to: str
    cc: str
    subject: str
    body: str

@app.post("/api/email/send", dependencies=[Depends(verify_token)])
def send_email(request: SendEmailRequest):
    # This requires Domain-Wide Delegation or specific user credentials, 
    # but service accounts can send emails if configured.
    # We will stub this logic for now but implement the integration.
    try:
        creds_dict = load_service_account_info()
        scopes = ["https://www.googleapis.com/auth/gmail.send"]
        creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
        
        service = build('gmail', 'v1', credentials=creds)
        
        from email.message import EmailMessage
        import base64

        message = EmailMessage()
        message.set_content(request.body)
        message['To'] = request.to
        if request.cc:
            message['Cc'] = request.cc
        message['Subject'] = request.subject

        # encoded message
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        create_message = {
            'raw': encoded_message
        }
        
        # 'me' refers to the authenticated user. For service accounts, this only works 
        # if the service account has DWD and we use subject=...
        # We will attempt to send it. If it fails, we fall back to logging.
        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        return {"status": "success", "message_id": send_message["id"]}
    except Exception as e:
        # Since service accounts can't just send email without DWD, we might catch an error here.
        print(f"Error sending email directly: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal mengirim email: {str(e)}")

