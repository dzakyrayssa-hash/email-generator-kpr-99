import json
import os
import re
import urllib.parse

import gspread
import pandas as pd
import streamlit as st
from google.oauth2.service_account import Credentials


st.set_page_config(page_title="KPR Sheet Automation", layout="wide")


st.markdown("""
<style>

/* Hide Streamlit UI */
#MainMenu {visibility:hidden;}
footer {visibility:hidden;}
header {visibility:hidden;}

[data-testid="stToolbar"] {
    display:none;
}

[data-testid="stDecoration"] {
    display:none;
}

/* Rapihin jarak atas */
.block-container {
    padding-top: 2rem;
}

/* Font input */
textarea {
    font-size:16px !important;
    line-height:1.5 !important;
}

input {
    font-size:16px !important;
}

</style>
""", unsafe_allow_html=True)

st.image("logo_99.png", width=120)


st.title("Email Automation System")
st.write(
    "Tools internal untuk membuat draft email konfirmasi akad, "
    "menyimpan event log, dan mengelola preset tim."
)


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
]

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
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
# Fallback kecil untuk bank yang belum ada di mapping bisnis utama.
BANK_ENTITY_FALLBACK = {
    "Lainnya": "WMI",
}
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
DEFAULT_BANK_OPTIONS = [
    "OCBC",
    "Sinarmas",
    "INA",
    "UOB",
    "Permata",
    "Maybank",
    "Danamon",
    "BSI Jawa Timur",
    "Ganesha",
    "BSI",
    "Muamalat",
    "CIMB Niaga",
    "Mandiri",
    "KB",
    "CIMB Syariah",
    "Lainnya",
]


if "txt_to" not in st.session_state:
    st.session_state.txt_to = ""
if "txt_from" not in st.session_state:
    st.session_state.txt_from = "akun.kantor@99.co"
if "last_generated_draft" not in st.session_state:
    st.session_state.last_generated_draft = None
if "app_access_granted" not in st.session_state:
    st.session_state.app_access_granted = False


def update_to():
    selected_label = st.session_state.dd_to
    if selected_label != "-- Ketik Manual / Kosongkan --":
        bank_email_lookup = st.session_state.get("bank_email_lookup", {})
        st.session_state.txt_to = bank_email_lookup.get(selected_label, selected_label)


def update_from():
    if st.session_state.dd_from != "-- Ketik Manual / Kosongkan --":
        st.session_state.txt_from = st.session_state.dd_from


def get_config_value(secret_key, env_key, default=None):
    if secret_key in st.secrets:
        return st.secrets[secret_key]

    env_value = os.getenv(env_key)
    if env_value is not None and env_value.strip():
        return env_value.strip()

    return default


def load_service_account_info():
    if "gcp_service_account" in st.secrets:
        return dict(st.secrets["gcp_service_account"])

    raw_json = os.getenv("GCP_SERVICE_ACCOUNT_JSON", "").strip()
    if raw_json:
        try:
            return json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Environment variable GCP_SERVICE_ACCOUNT_JSON tidak valid."
            ) from exc

    raise RuntimeError(
        "Kredensial Google belum tersedia. Tambahkan `gcp_service_account` "
        "ke Streamlit secrets atau set environment variable "
        "`GCP_SERVICE_ACCOUNT_JSON`."
    )


def get_runtime_config():
    return {
        "main_spreadsheet_id": get_config_value(
            "main_spreadsheet_id",
            "MAIN_SPREADSHEET_ID",
            DEFAULT_MAIN_SPREADSHEET_ID,
        ),
        "log_spreadsheet_id": get_config_value(
            "log_spreadsheet_id",
            "LOG_SPREADSHEET_ID",
            DEFAULT_LOG_SPREADSHEET_ID,
        ),
    }


def show_blocking_error(message):
    st.error(message)
    st.info(
        "Untuk local run, buat `.streamlit/secrets.toml` dari file contoh. "
        "Untuk Streamlit Cloud, isi Secrets di dashboard deployment."
    )
    st.stop()


def require_app_access():
    configured_password = get_config_value("app_password", "APP_PASSWORD", "")
    if configured_password is None:
        configured_password = ""
    configured_password = str(configured_password).strip()

    if not configured_password or st.session_state.app_access_granted:
        return

    st.warning("Aplikasi ini dilindungi password internal.")
    with st.form("app_access_form"):
        typed_password = st.text_input("Password aplikasi", type="password")
        submitted = st.form_submit_button("Masuk", type="primary")

    if submitted:
        if typed_password == configured_password:
            st.session_state.app_access_granted = True
            st.rerun()
        st.error("Password salah.")

    st.stop()


@st.cache_resource
def get_gspread_client():
    creds_dict = load_service_account_info()
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    return gspread.authorize(creds)


def ensure_sheet_headers(ws, expected_headers):
    current_headers = ws.row_values(1)
    if current_headers != expected_headers:
        ws.update(values=[expected_headers], range_name="A1")


def get_or_create_worksheet(spreadsheet, title, rows, cols, headers):
    try:
        ws = spreadsheet.worksheet(title)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=title, rows=str(rows), cols=str(cols))
    ensure_sheet_headers(ws, headers)
    return ws


@st.cache_data(ttl=60, show_spinner=False)
def load_main_data():
    config = get_runtime_config()
    client = get_gspread_client()
    sheet = client.open_by_key(config["main_spreadsheet_id"]).worksheet(MAIN_WORKSHEET_NAME)
    data = sheet.get_all_values()

    if not data:
        return pd.DataFrame()

    headers = [str(header).strip() for header in data[0]]
    df = pd.DataFrame(data[1:], columns=headers)
    df.columns = df.columns.astype(str).str.strip()
    df["__sheet_row_number"] = range(2, len(df) + 2)
    return df


def init_support_sheets():
    config = get_runtime_config()
    client = get_gspread_client()
    spreadsheet = client.open_by_key(config["log_spreadsheet_id"])
    ws_log = get_or_create_worksheet(
        spreadsheet,
        LOG_WORKSHEET_NAME,
        rows=500,
        cols=len(LOG_COLUMNS) + 2,
        headers=LOG_COLUMNS,
    )
    ws_settings = get_or_create_worksheet(
        spreadsheet,
        SETTINGS_WORKSHEET_NAME,
        rows=200,
        cols=len(SETTINGS_COLUMNS) + 2,
        headers=SETTINGS_COLUMNS,
    )
    return ws_log, ws_settings


def ensure_dataframe_columns(df, columns):
    if df.empty:
        return pd.DataFrame(columns=columns)

    normalized = df.copy()
    for column in columns:
        if column not in normalized.columns:
            normalized[column] = ""

    return normalized[columns]


def load_settings_data(ws_settings):
    try:
        records = ws_settings.get_all_records()
        df = pd.DataFrame(records) if records else pd.DataFrame(columns=SETTINGS_COLUMNS)
        return ensure_dataframe_columns(df, SETTINGS_COLUMNS)
    except Exception as exc:
        st.warning(f"Gagal membaca sheet pengaturan. Detail: {exc}")
        return pd.DataFrame(columns=SETTINGS_COLUMNS)


def load_log_data(ws_log):
    try:
        records = ws_log.get_all_records()
        df = pd.DataFrame(records) if records else pd.DataFrame(columns=LOG_COLUMNS)
        return ensure_dataframe_columns(df, LOG_COLUMNS)
    except Exception as exc:
        st.warning(f"Gagal membaca sheet log. Detail: {exc}")
        return pd.DataFrame(columns=LOG_COLUMNS)


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


def clean_text(value):
    if pd.isna(value):
        return ""
    return str(value).strip()


def format_date_display(raw_value):
    raw_text = clean_text(raw_value)
    if not raw_text:
        return ""

    date_part = raw_text.split(" ")[0]
    parts = date_part.split("-")
    if len(parts) == 3 and len(parts[0]) == 4:
        year, month, day = parts
        month_map = {
            "01": "Januari",
            "02": "Februari",
            "03": "Maret",
            "04": "April",
            "05": "Mei",
            "06": "Juni",
            "07": "Juli",
            "08": "Agustus",
            "09": "September",
            "10": "Oktober",
            "11": "November",
            "12": "Desember",
        }
        return f"{int(day)} {month_map.get(month.zfill(2), month)} {year}"

    return raw_text


def parse_numeric_amount(raw_value):
    digits = "".join(ch for ch in clean_text(raw_value) if ch.isdigit())
    return int(digits) if digits else 0


def format_idr(amount):
    return f"Rp {amount:,.0f}".replace(",", ".")


def format_plafond_value(raw_value):
    amount = parse_numeric_amount(raw_value)
    if amount > 0:
        return format_idr(amount)
    return clean_text(raw_value)


def build_transaction_id(row_data, native_id_column):
    source_row = int(row_data["__sheet_row_number"])
    native_id = clean_text(row_data.get(native_id_column, "")) if native_id_column else ""
    if native_id:
        return f"TX-{native_id}"
    return f"ROW-{source_row}"


def build_dropdown_label(row_data, name_col, date_col, bank_col, transaction_id, source_row):
    name_value = clean_text(row_data.get(name_col, "")) or "Tanpa Nama"
    date_value = format_date_display(row_data.get(date_col, "")) or "Tanpa Tanggal"
    bank_value = clean_text(row_data.get(bank_col, "")) or "Tanpa Bank"
    return f"{name_value} | {date_value} | {bank_value} | {transaction_id} | Row {source_row}"


def split_email_values(raw_text):
    normalized = raw_text.replace(";", ",")
    return [part.strip() for part in normalized.split(",") if part.strip()]


def invalid_emails_from_text(raw_text):
    invalid = []
    for email in split_email_values(raw_text):
        if not EMAIL_PATTERN.match(email):
            invalid.append(email)
    return invalid


def validate_preset_input(kategori, nama_baru, isi_baru):
    if kategori in {"Email CC", "Email Pengirim", "Email Bank Tujuan"}:
        invalid = invalid_emails_from_text(nama_baru)
        if invalid:
            return f"Format email preset tidak valid: {', '.join(invalid)}"

    if not nama_baru.strip() or not isi_baru.strip():
        return "Isian tidak boleh kosong."

    return ""


def validate_bank_email_preset(bank_name, email_value):
    if not normalize_bank_name(bank_name):
        return "Nama bank wajib diisi."

    invalid = invalid_emails_from_text(email_value)
    if invalid:
        return f"Format email preset tidak valid: {', '.join(invalid)}"

    return ""


def normalize_bank_name(bank_name):
    cleaned = clean_text(bank_name)
    if not cleaned:
        return ""

    upper_cleaned = cleaned.upper()
    for source_name, target_name in BANK_DISPLAY_ALIASES.items():
        if upper_cleaned == source_name.upper():
            return target_name
    return cleaned


def infer_bank_name_from_text(raw_text):
    normalized_text = clean_text(raw_text).lower()
    if not normalized_text:
        return ""

    for bank_name, keywords in EMAIL_BANK_KEYWORDS.items():
        if any(keyword in normalized_text for keyword in keywords):
            return bank_name

    return ""


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


def resolve_entity_from_bank(bank_name, bank_entity_map, preferred_entity_code=""):
    normalized_bank = normalize_bank_name(bank_name)
    return bank_entity_map.get(normalized_bank) or preferred_entity_code or "WMI"


def build_bank_option_map(bank_names, bank_entity_map):
    grouped_options = []
    option_map = {}
    seen_banks = set()
    for bank_name in bank_names:
        normalized_bank = normalize_bank_name(bank_name)
        if not normalized_bank or normalized_bank in seen_banks:
            continue
        seen_banks.add(normalized_bank)
        entity_code = bank_entity_map.get(normalized_bank, "")
        if entity_code:
            display_label = f"{entity_code} | {normalized_bank}"
        else:
            display_label = f"Belum dipetakan | {normalized_bank}"
        grouped_options.append(display_label)
        option_map[display_label] = normalized_bank

    return grouped_options, option_map


def append_log_event(ws_log, event):
    row = [event.get(column, "") for column in LOG_COLUMNS]
    ws_log.append_row(row, value_input_option="USER_ENTERED")


def build_log_event(
    *,
    status,
    transaction_id,
    source_row,
    nama,
    bank,
    plafond,
    email_to,
    pic_pengirim,
    platform,
    catatan="",
):
    return {
        "Waktu Proses": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        "Nama Debitur": nama,
        "Bank Tujuan": bank,
        "Plafond Kredit": plafond,
        "Email Tujuan (To)": email_to or "Tidak diisi",
        "PIC Pengirim": pic_pengirim or "Tidak diisi",
        "Platform": platform,
        "Transaction ID": transaction_id,
        "Sumber Baris": source_row,
        "Status": status,
        "Catatan": catatan,
    }


def format_bank_email_label(bank_name, email_value):
    normalized_bank = normalize_bank_name(bank_name)
    normalized_email = clean_text(email_value).lower()
    if normalized_bank:
        return f"{normalized_bank} | {normalized_email}"
    return normalized_email


def parse_email_bank_entry(setting_row):
    label = clean_text(setting_row.get("Nama Template", ""))
    email_value = clean_text(setting_row.get("Isi Template", "")) or label
    email_value = email_value.lower()

    bank_name = ""
    if "|" in label:
        first_part = label.split("|", 1)[0]
        bank_name = normalize_bank_name(first_part)

    if not bank_name:
        bank_name = infer_bank_name_from_text(f"{label} {email_value}")

    display_label = format_bank_email_label(bank_name, email_value)
    return {
        "bank": bank_name,
        "email": email_value,
        "display_label": display_label,
        "original_label": label,
    }


def build_email_bank_entries(df_settings):
    entries = []
    filtered_df = df_settings[df_settings["Kategori"] == "Email Bank Tujuan"]
    seen_pairs = set()

    for _, row in filtered_df.iterrows():
        entry = parse_email_bank_entry(row)
        if not entry["email"]:
            continue

        dedupe_key = (entry["bank"], entry["email"])
        if dedupe_key in seen_pairs:
            continue

        seen_pairs.add(dedupe_key)
        entries.append(entry)

    return entries


def render_settings_category_tab(kategori, df_settings, ws_settings):
    filtered_df = df_settings[df_settings["Kategori"] == kategori].copy()
    item_count = len(filtered_df)
    st.caption(f"Total data tersimpan: {item_count}")

    form_suffix = re.sub(r"[^a-z0-9]+", "_", kategori.lower()).strip("_")
    with st.form(f"form_tambah_template_{form_suffix}"):
        if kategori == "Email Bank Tujuan":
            st.info(
                "Simpan email bank dengan format `Bank | Email` agar nanti bisa "
                "difilter otomatis sesuai bank yang dipilih di generator."
            )
            selected_bank_for_preset = st.selectbox(
                "Pilih Bank:",
                options=DEFAULT_BANK_OPTIONS,
                key=f"settings_bank_picker_{form_suffix}",
            )
            if selected_bank_for_preset == "Lainnya":
                custom_bank_name = st.text_input(
                    "Nama Bank Lainnya:",
                    placeholder="Contoh: BCA",
                )
                bank_name = normalize_bank_name(custom_bank_name)
            else:
                bank_name = normalize_bank_name(selected_bank_for_preset)

            email_input = st.text_input(
                "Email Bank Tujuan (contoh: user@bank.co.id):"
            )
            nama_baru = format_bank_email_label(bank_name, email_input)
            isi_baru = clean_text(email_input).lower()
        elif kategori in ["Email CC", "Email Pengirim"]:
            st.info(
                f"Tambahkan alamat {kategori} ke database agar mudah dipilih nanti."
            )
            nama_baru = st.text_input(
                f"Alamat {kategori} (contoh: dzaky.rayssa@99.co):"
            )
            isi_baru = nama_baru
        else:
            nama_baru = st.text_input(
                f"Nama Template {kategori} (contoh: Versi Bank X):"
            )
            isi_baru = st.text_area(
                f"Isi / teks paragraf {kategori}:",
                height=120,
            )

        if st.form_submit_button("Simpan ke Database", type="primary"):
            if kategori == "Email Bank Tujuan":
                duplicate_exists = not df_settings[
                    (df_settings["Kategori"] == kategori)
                    & (
                        df_settings["Isi Template"].astype(str).str.strip().str.lower()
                        == isi_baru.strip().lower()
                    )
                ].empty
                validation_error = validate_bank_email_preset(bank_name, isi_baru)
            else:
                duplicate_exists = not df_settings[
                    (df_settings["Kategori"] == kategori)
                    & (
                        df_settings["Nama Template"].astype(str).str.strip().str.lower()
                        == nama_baru.strip().lower()
                    )
                ].empty
                validation_error = validate_preset_input(kategori, nama_baru, isi_baru)

            if validation_error:
                st.error(validation_error)
            elif duplicate_exists:
                st.error(
                    "Preset dengan kategori dan nama yang sama sudah ada. "
                    "Gunakan nama lain agar tidak membingungkan user."
                )
            elif ws_settings is None:
                st.error("Sheet pengaturan tidak tersedia, sehingga data belum bisa disimpan.")
            else:
                try:
                    ws_settings.append_row(
                        [kategori, nama_baru.strip(), isi_baru.strip()],
                        value_input_option="USER_ENTERED",
                    )
                    st.success(
                        f"Preset '{nama_baru.strip()}' berhasil disimpan. Halaman akan dimuat ulang."
                    )
                    st.rerun()
                except Exception as exc:
                    st.error(f"Gagal menyimpan preset ke Google Sheets. Detail: {exc}")

    st.markdown("---")
    if filtered_df.empty:
        st.info(f"Belum ada data untuk kategori {kategori}.")
    else:
        if kategori == "Email Bank Tujuan":
            display_rows = []
            for _, row in filtered_df.iterrows():
                parsed_entry = parse_email_bank_entry(row)
                display_rows.append(
                    {
                        "Bank": parsed_entry["bank"] or "Belum dipetakan",
                        "Label": parsed_entry["display_label"],
                        "Email": parsed_entry["email"],
                    }
                )
            display_df = pd.DataFrame(display_rows)
            st.dataframe(display_df, use_container_width=True)
        else:
            st.dataframe(filtered_df, use_container_width=True)


require_app_access()

runtime_config = get_runtime_config()
if not runtime_config["main_spreadsheet_id"] or not runtime_config["log_spreadsheet_id"]:
    show_blocking_error("Spreadsheet ID belum terkonfigurasi.")

try:
    df_kpr = load_main_data()
except Exception as exc:
    show_blocking_error(f"Gagal mengambil data utama dari Google Sheets. Detail: {exc}")

ws_log = None
ws_settings = None
df_log = pd.DataFrame(columns=LOG_COLUMNS)
df_settings = pd.DataFrame(columns=SETTINGS_COLUMNS)

try:
    ws_log, ws_settings = init_support_sheets()
    df_log = load_log_data(ws_log)
    df_settings = load_settings_data(ws_settings)
except Exception as exc:
    st.warning(
        "Sheet log/pengaturan tidak bisa diakses sekarang. "
        f"Generator email tetap bisa dipakai, tetapi event log dan preset tidak akan tersimpan. Detail: {exc}"
    )


list_komisi_custom = (
    df_settings[df_settings["Kategori"] == "Komisi"]["Nama Template"].dropna().tolist()
)
list_penutup_custom = (
    df_settings[df_settings["Kategori"] == "Penutup"]["Nama Template"].dropna().tolist()
)
list_email_cc_db = (
    df_settings[df_settings["Kategori"] == "Email CC"]["Nama Template"].dropna().tolist()
)
list_email_pengirim_db = (
    df_settings[df_settings["Kategori"] == "Email Pengirim"]["Nama Template"].dropna().tolist()
)
list_email_bank_entries = build_email_bank_entries(df_settings)


tab_generator, tab_dashboard, tab_settings = st.tabs(
    ["Generator Email", "Log Aktivitas", "Database Pengaturan"]
)


with tab_generator:
    if df_kpr.empty:
        st.warning("Data utama kosong. Pastikan worksheet utama berisi header dan data.")
    else:
        st.success("Database utama berhasil ditarik dalam mode baca-saja.")

        columns = df_kpr.columns.tolist()
        col_name = find_first_matching_column(
            columns,
            exact_names=["Customer Name", "Nama Debitur", "Name"],
            contains_keywords=["customer name", "nama", "name"],
        )
        col_plafond = find_first_matching_column(
            columns,
            exact_names=["GMV \nPlafond / Disbursed Amount (IDR)", "Total Plafond"],
            contains_keywords=["plafond", "disbursed amount", "gmv"],
        )
        col_product = find_first_matching_column(
            columns,
            exact_names=["Type", "Credit Facility", "Produk"],
            contains_keywords=["type", "facility", "produk"],
        )
        col_bank = find_first_matching_column(
            columns,
            exact_names=["Bank disbursed", "Bank"],
            contains_keywords=["bank disbursed", "bank"],
        )
        col_tanggal = find_first_matching_column(
            columns,
            exact_names=["Tanggal Akad", "Tanggal Akad Kredit"],
            contains_keywords=["tanggal akad"],
        )
        col_payment_account = find_first_matching_column(
            columns,
            exact_names=["Payment\nR123 Account", "Payment R123 Account"],
            contains_keywords=["payment", "r123 account"],
        )
        native_id_column = find_first_matching_column(
            columns,
            exact_names=["Transaction ID", "Lead ID", "ID Transaksi", "ID"],
            contains_keywords=[],
        )
        bank_entity_map = build_bank_entity_map(df_kpr, col_bank, col_payment_account)

        missing_core_columns = [
            label
            for label, column in {
                "nama debitur": col_name,
                "plafond": col_plafond,
                "produk": col_product,
                "bank": col_bank,
                "tanggal akad": col_tanggal,
            }.items()
            if column is None
        ]
        if missing_core_columns:
            st.error(
                "Header sheet utama berubah dan beberapa kolom penting tidak ditemukan: "
                + ", ".join(missing_core_columns)
            )
            st.stop()

        selection_map = {}
        for row_index, row_data in df_kpr.iterrows():
            candidate_name = clean_text(row_data.get(col_name, ""))
            if not candidate_name or "example" in candidate_name.lower():
                continue
            transaction_id = build_transaction_id(row_data, native_id_column)
            dropdown_label = build_dropdown_label(
                row_data,
                col_name,
                col_tanggal,
                col_bank,
                transaction_id,
                int(row_data["__sheet_row_number"]),
            )
            selection_map[dropdown_label] = row_index

        if not selection_map:
            st.warning("Tidak ada transaksi valid yang bisa dipilih dari sheet utama.")
            st.stop()

        st.markdown("---")
        st.subheader("Pilih Transaksi")

        selected_label = st.selectbox(
            "Silakan pilih transaksi yang akan dibuatkan draft email:",
            options=list(selection_map.keys()),
        )

        if selected_label:
            selected_index = selection_map[selected_label]
            row_data = df_kpr.loc[selected_index]

            nama_nasabah = clean_text(row_data[col_name])
            produk_asal = clean_text(row_data[col_product])
            bank_asal = normalize_bank_name(row_data[col_bank])
            plafond_raw = clean_text(row_data[col_plafond])
            plafond_asal = format_plafond_value(plafond_raw)
            tanggal_asal = format_date_display(row_data[col_tanggal])
            source_row = int(row_data["__sheet_row_number"])
            transaction_id = build_transaction_id(row_data, native_id_column)
            payment_account_asal = (
                clean_text(row_data.get(col_payment_account, "")) if col_payment_account else ""
            )
            entity_code_asal = resolve_entity_from_bank(
                bank_asal,
                bank_entity_map,
                preferred_entity_code=detect_entity_code(payment_account_asal),
            )

            col1, col2, col3 = st.columns([1, 1, 2])
            with col1:
                waktu_salam = st.selectbox(
                    "Salam Waktu:",
                    ["Selamat pagi", "Selamat siang", "Selamat sore", "Salam hangat", "Tanpa Salam"],
                )
            with col2:
                panggilan = st.selectbox("Panggilan:", ["Bapak", "Ibu", "Tanpa Panggilan"])
            with col3:
                nama_penerima = st.text_input(
                    "Nama Penerima (Orang Bank):",
                    placeholder="Contoh: Candra / Meylin",
                )

            list_bank = DEFAULT_BANK_OPTIONS.copy()
            bank_bersih = bank_asal if bank_asal not in {"", "nan", "None"} else ""
            if bank_bersih and bank_bersih not in list_bank:
                list_bank.insert(0, bank_bersih)

            bank_options, bank_option_map = build_bank_option_map(list_bank, bank_entity_map)
            default_bank = bank_bersih if bank_bersih in list_bank else list_bank[0]
            default_bank_label = next(
                (
                    label
                    for label, bank_name in bank_option_map.items()
                    if bank_name == default_bank
                ),
                bank_options[0],
            )
            selected_bank_label = st.selectbox(
                "Bank Tujuan:",
                options=bank_options,
                index=bank_options.index(default_bank_label),
            )
            bank = bank_option_map[selected_bank_label]
            entity_code = resolve_entity_from_bank(
                bank,
                bank_entity_map,
                preferred_entity_code=entity_code_asal if bank == bank_asal else "",
            )
            platform = ENTITY_PLATFORM_MAP[entity_code]
            if normalize_bank_name(bank) in bank_entity_map:
                st.caption(
                    f"Platform otomatis: {ENTITY_DISPLAY_MAP[entity_code]} "
                    f"(ditentukan dari mapping bank)."
                )
            else:
                st.warning(
                    f"Bank `{bank}` belum punya mapping eksplisit. "
                    f"Sementara dipakai {ENTITY_DISPLAY_MAP[entity_code]}."
                )

            st.markdown("---")
            st.subheader("Pengaturan Alamat Email")

            col_em1, col_em2 = st.columns(2)
            with col_em1:
                filtered_email_bank_entries = [
                    entry
                    for entry in list_email_bank_entries
                    if entry["bank"] == normalize_bank_name(bank)
                ]
                if not filtered_email_bank_entries:
                    filtered_email_bank_entries = [
                        entry for entry in list_email_bank_entries if not entry["bank"]
                    ]

                bank_email_option_map = {
                    entry["display_label"]: entry["email"]
                    for entry in filtered_email_bank_entries
                }
                st.session_state.bank_email_lookup = bank_email_option_map
                opsi_bank = ["-- Ketik Manual / Kosongkan --"] + list(bank_email_option_map.keys())
                if st.session_state.get("dd_to") not in opsi_bank:
                    st.session_state.dd_to = "-- Ketik Manual / Kosongkan --"
                st.selectbox(
                    "Isi Cepat Email Bank (Dari Database):",
                    options=opsi_bank,
                    key="dd_to",
                    on_change=update_to,
                )
                email_penerima = st.text_input(
                    "Email Bank Tujuan (To):",
                    key="txt_to",
                    placeholder="Ketik bebas atau pilih dari atas...",
                )
                if bank_email_option_map:
                    st.caption(
                        f"Menampilkan {len(bank_email_option_map)} email preset untuk bank {bank}."
                    )
                else:
                    st.caption(
                        f"Belum ada preset `Bank | Email` untuk bank {bank}. "
                        "Tetap bisa ketik manual."
                    )

            with col_em2:
                opsi_pengirim = ["-- Ketik Manual / Kosongkan --", "akun.kantor@99.co"] + [
                    email for email in list_email_pengirim_db if email != "akun.kantor@99.co"
                ]
                st.selectbox(
                    "Isi Cepat Email Pengirim:",
                    options=opsi_pengirim,
                    key="dd_from",
                    on_change=update_from,
                )
                email_pengirim = st.text_input(
                    "Email Karyawan / Pengirim:",
                    key="txt_from",
                    placeholder="Ketik bebas atau pilih dari atas...",
                )

            st.write("**Daftar CC (Tembusan)**")
            pilihan_cc_checkbox = st.multiselect(
                "Pilih Email CC dari Database (boleh lebih dari satu):",
                options=list_email_cc_db,
            )
            cc_custom = st.text_input(
                "Atau ketik manual Email CC tambahan (opsional):",
                placeholder="Contoh: bos@99.co, finance@99.co",
            )

            list_email_cc_final = pilihan_cc_checkbox.copy()
            list_email_cc_final.extend(split_email_values(cc_custom))
            daftar_cc_final = ", ".join(list_email_cc_final)
            if daftar_cc_final:
                st.caption(f"Email CC yang akan dipakai: {daftar_cc_final}")

            if not df_log.empty:
                sudah_pernah = df_log[
                    df_log["Transaction ID"].astype(str).str.strip() == transaction_id
                ]
                if sudah_pernah.empty:
                    sudah_pernah = df_log[
                        df_log["Nama Debitur"].astype(str).str.lower() == nama_nasabah.lower()
                    ]
                if not sudah_pernah.empty:
                    latest_event = (
                        sudah_pernah.sort_values(by="Waktu Proses", ascending=False).iloc[0]
                    )
                    st.warning(
                        "Transaksi ini pernah tercatat sebelumnya. "
                        f"Status terakhir: {latest_event['Status'] or 'Tanpa Status'} "
                        f"pada {latest_event['Waktu Proses']}."
                    )

            st.markdown("---")
            st.subheader("Tinjauan Data Otomatis")
            st.caption(f"Transaction ID: {transaction_id} | Sumber baris sheet: {source_row}")

            format_laporan = st.radio(
                "Format tampilan data nasabah:",
                ["Vertikal Ke Bawah (Komplit)", "Satu Baris (Simpel)"],
            )

            nama = st.text_input("Nama Debitur:", value=nama_nasabah)
            tanggal = st.text_input("Tanggal Akad Kredit:", value=tanggal_asal)
            produk = st.text_input("Produk / Fasilitas KPR:", value=produk_asal)
            st.caption("Perubahan di form ini hanya memengaruhi draft email, bukan sheet utama.")

            st.write("**Pengaturan Nilai Plafond**")
            mode_plafond = st.radio(
                "Format plafond di email:",
                ["Standar (1 Baris)", "Pecah Take Over + Top Up (3 Baris)"],
            )

            angka_total_awal = parse_numeric_amount(plafond_raw)
            string_plafond_email = ""
            plafond_log = ""
            top_up_val = 0

            if mode_plafond == "Pecah Take Over + Top Up (3 Baris)":
                st.info(f"Total plafond dari database: {format_idr(angka_total_awal)}")
                top_up_raw = st.text_input(
                    "Nominal Top Up (boleh pakai titik/Rp):",
                    value="0",
                )
                top_up_val = parse_numeric_amount(top_up_raw)
                take_over_val = angka_total_awal - top_up_val

                to_str = f"{format_idr(take_over_val)}.-"
                tu_str = f"{format_idr(top_up_val)}.-"
                total_str = f"{format_idr(angka_total_awal)}.-"
                string_plafond_email = (
                    f"Plafond Take Over : {to_str}\n"
                    f"Plafond Top Up    : {tu_str}\n"
                    f"Total Plafond     : {total_str}"
                )
                plafond_log = total_str
            else:
                plafond_input = st.text_input("Nilai Plafond Standar:", value=plafond_asal)
                string_plafond_email = f"Plafond      : {plafond_input}"
                plafond_log = plafond_input

            sales_name = ""
            note_bank_spesifik = ""
            if bank == "UOB":
                sales_name = st.text_input(
                    "Nama Sales (khusus UOB):",
                    placeholder="Contoh: Nadya Tim Andreas",
                )
                if st.checkbox("Tambahkan keterangan komisi sudah dibayar?"):
                    note_bank_spesifik = "dan komisi sudah di-payment ke 99.co"
            elif bank == "Permata":
                if st.checkbox("Ada pengajuan diskon provisi nasabah?"):
                    persen = st.text_input(
                        "Persentase diskon provisi:",
                        placeholder="Contoh: 0.5%",
                    )
                    note_bank_spesifik = (
                        f"nasabah mengajukan diskon provisi menjadi {persen}"
                    )

            st.markdown("---")
            st.subheader("Paragraf Komisi")
            opsi_komisi = ["Template Utama (Bullet Point Rapi)", "Kosong / Ketik Manual"] + list_komisi_custom
            pilih_komisi = st.selectbox("Pilih Template Paragraf Komisi:", options=opsi_komisi)

            if pilih_komisi == "Template Utama (Bullet Point Rapi)":
                teks_default_komisi = (
                    "Mohon informasinya juga mengenai komisi KPR:\n"
                    "- Apakah komisi dibayarkan sesuai 1% dari nilai plafond?\n"
                    "- Atau terdapat penyesuaian dikarenakan permohonan diskon / program khusus dari pihak bank?"
                )
            elif pilih_komisi == "Kosong / Ketik Manual":
                teks_default_komisi = ""
            else:
                teks_default_komisi = df_settings[
                    (df_settings["Kategori"] == "Komisi")
                    & (df_settings["Nama Template"] == pilih_komisi)
                ].iloc[0]["Isi Template"]
            isi_komisi = st.text_area("Isi Paragraf Komisi:", value=teks_default_komisi, height=150)

            st.markdown("---")
            st.subheader("Paragraf Penutup")
            opsi_penutup = ["Template Standar", "Kosong / Ketik Manual"] + list_penutup_custom
            if bank in ["Permata", "UOB", "CIMB Syariah"]:
                opsi_penutup.insert(0, f"Template Otomatis Bank {bank}")
            pilih_penutup = st.selectbox("Pilih Template Paragraf Penutup:", options=opsi_penutup)

            if pilih_penutup == "Template Standar":
                teks_default_penutup = (
                    "Mohon dibantu konfirmasi apabila transaksi tersebut sudah benar. Terima kasih."
                )
            elif pilih_penutup == f"Template Otomatis Bank {bank}":
                if bank == "Permata":
                    teks_default_penutup = (
                        "Apakah informasi tersebut benar, apakah nasabah ada permohonan "
                        "diskon provisi ke perbankan, dan apakah nominal komisi yang "
                        "dibayarkan 1% dari plafond?\n\n"
                        "Atas perhatian dan kerja samanya, terima kasih."
                    )
                elif bank == "UOB":
                    teks_default_penutup = (
                        f"Informasi ybs sudah akad di bank UOB tanggal {tanggal}.\n\n"
                        "Terima kasih atas bantuan dan supportnya."
                    )
                else:
                    teks_default_penutup = (
                        "Mohon konfirmasinya atas data tersebut. Terima kasih."
                    )
            elif pilih_penutup == "Kosong / Ketik Manual":
                teks_default_penutup = ""
            else:
                teks_default_penutup = df_settings[
                    (df_settings["Kategori"] == "Penutup")
                    & (df_settings["Nama Template"] == pilih_penutup)
                ].iloc[0]["Isi Template"]
            isi_penutup = st.text_area("Isi Paragraf Penutup:", value=teks_default_penutup, height=150)

            st.markdown("---")
            if st.button("Buat Draft Email", type="primary"):
                validation_errors = []

                if not tanggal.strip():
                    validation_errors.append("Tanggal akad wajib diisi.")

                if mode_plafond == "Pecah Take Over + Top Up (3 Baris)" and top_up_val > angka_total_awal:
                    validation_errors.append(
                        "Nominal Top Up tidak boleh lebih besar dari total plafond."
                    )

                invalid_to = invalid_emails_from_text(email_penerima)
                invalid_from = invalid_emails_from_text(email_pengirim)
                invalid_cc = [
                    email for email in list_email_cc_final if not EMAIL_PATTERN.match(email)
                ]

                if invalid_to:
                    validation_errors.append(
                        "Email tujuan tidak valid: " + ", ".join(invalid_to)
                    )
                if invalid_from:
                    validation_errors.append(
                        "Email pengirim tidak valid: " + ", ".join(invalid_from)
                    )
                if invalid_cc:
                    validation_errors.append(
                        "Email CC tidak valid: " + ", ".join(invalid_cc)
                    )

                if validation_errors:
                    for error in validation_errors:
                        st.error(error)
                else:
                    subjek_email = f"Konfirmasi plafond akad {platform} - {bank}"
                    if waktu_salam != "Tanpa Salam":
                        salam_pembuka = (
                            f"{waktu_salam}"
                            f"{' ' + panggilan if panggilan != 'Tanpa Panggilan' else ''}"
                            f"{' ' + nama_penerima if nama_penerima else ''},\n\n"
                        )
                    else:
                        salam_pembuka = ""

                    if bank == "CIMB Syariah":
                        pengantar = "Mohon bantuannya konfirmasi akad terkait dengan nasabah sbb:"
                    elif bank == "UOB":
                        pengantar = "Mohon bantuannya untuk konfirmasi data nasabah sbb:"
                    else:
                        pengantar = (
                            f"Di bawah ini adalah transaksi leads KPR referral {platform} "
                            f"yang sudah akad di Bank {bank}:"
                        )

                    if format_laporan == "Satu Baris (Simpel)":
                        detail_data = f"1. {nama}   {tanggal}   - {plafond_log}"
                        if bank == "Permata" and note_bank_spesifik:
                            detail_data += f" ({note_bank_spesifik})"
                    else:
                        detail_data = (
                            f"Nama Debitur : {nama}\n"
                            f"{string_plafond_email}\n"
                            f"Product      : {produk}\n"
                            f"Tgl Akad     : {tanggal}"
                        )
                        if bank == "UOB" and sales_name:
                            detail_data += (
                                f"\nSales        : {sales_name}\n"
                                "Komisi       : 1% dari Plafond"
                            )

                    penutup_final = isi_penutup.strip()
                    if isi_komisi.strip() and isi_komisi.strip() not in penutup_final:
                        penutup_final += f"\n\n{isi_komisi.strip()}"

                    email_utuh = (
                        f"{salam_pembuka}{pengantar}\n\n{detail_data}\n\n{penutup_final}"
                    )
                    subjek_encoded = urllib.parse.quote(subjek_email)
                    body_encoded = urllib.parse.quote(email_utuh)
                    cc_encoded = urllib.parse.quote(", ".join(list_email_cc_final))
                    gmail_url = (
                        "https://mail.google.com/mail/?view=cm&fs=1"
                        f"&to={urllib.parse.quote(email_penerima.strip())}"
                        f"&cc={cc_encoded}&su={subjek_encoded}&body={body_encoded}"
                    )
                    if email_pengirim.strip():
                        gmail_url += f"&authuser={urllib.parse.quote(email_pengirim.strip())}"

                    draft_event = build_log_event(
                        status="Draft Generated",
                        transaction_id=transaction_id,
                        source_row=source_row,
                        nama=nama,
                        bank=bank,
                        plafond=plafond_log,
                        email_to=email_penerima.strip(),
                        pic_pengirim=email_pengirim.strip(),
                        platform=platform,
                        catatan="Draft dibuat dari aplikasi.",
                    )

                    if ws_log is not None:
                        try:
                            append_log_event(ws_log, draft_event)
                            st.success("Event log tersimpan dengan status: Draft Generated.")
                        except Exception as exc:
                            st.warning(
                                "Draft berhasil dibuat, tetapi event log gagal disimpan. "
                                f"Detail: {exc}"
                            )
                    else:
                        st.warning(
                            "Draft berhasil dibuat, tetapi sheet log sedang tidak tersedia."
                        )

                    st.session_state.last_generated_draft = {
                        "gmail_url": gmail_url,
                        "email_text": email_utuh,
                        "event": draft_event,
                        "manual_sent_confirmed": False,
                    }
                    st.rerun()

            last_draft = st.session_state.last_generated_draft
            if last_draft:
                st.markdown("---")
                st.subheader("Draft Terakhir")
                st.info(
                    "Log saat ini bersifat event-based. Draft yang baru dibuat dicatat "
                    "sebagai `Draft Generated`. Jika email benar-benar sudah dikirim, "
                    "tekan tombol konfirmasi manual di bawah."
                )
                col_draft_1, col_draft_2 = st.columns([1, 1])
                with col_draft_1:
                    st.link_button("Buka Draft di Gmail", url=last_draft["gmail_url"], type="primary")
                with col_draft_2:
                    if last_draft["manual_sent_confirmed"]:
                        st.success("Status kirim manual sudah dicatat.")
                    elif st.button("Tandai Sudah Dikirim (Manual)"):
                        sent_event = build_log_event(
                            status="Sent Confirmed (Manual)",
                            transaction_id=last_draft["event"]["Transaction ID"],
                            source_row=last_draft["event"]["Sumber Baris"],
                            nama=last_draft["event"]["Nama Debitur"],
                            bank=last_draft["event"]["Bank Tujuan"],
                            plafond=last_draft["event"]["Plafond Kredit"],
                            email_to=last_draft["event"]["Email Tujuan (To)"],
                            pic_pengirim=last_draft["event"]["PIC Pengirim"],
                            platform=last_draft["event"]["Platform"],
                            catatan="Dikonfirmasi manual oleh user setelah kirim dari Gmail.",
                        )
                        if ws_log is not None:
                            try:
                                append_log_event(ws_log, sent_event)
                                st.session_state.last_generated_draft["manual_sent_confirmed"] = True
                                st.success("Konfirmasi kirim manual berhasil dicatat.")
                                st.rerun()
                            except Exception as exc:
                                st.error(
                                    "Konfirmasi kirim manual gagal disimpan ke log. "
                                    f"Detail: {exc}"
                                )
                        else:
                            st.warning(
                                "Sheet log tidak tersedia, sehingga konfirmasi kirim belum tercatat."
                            )
                st.code(last_draft["email_text"], language="text")


with tab_dashboard:
    st.subheader("Event Log Aktivitas")
    st.caption(
        "Log sekarang bersifat append-only agar histori tidak mudah hilang. "
        "Status `Draft Generated` berarti draft dibuat. Status "
        "`Sent Confirmed (Manual)` berarti user menandai email sudah dikirim."
    )

    if df_log.empty:
        st.info("Belum ada event log yang tersimpan.")
    else:
        df_log_display = df_log.sort_values(by="Waktu Proses", ascending=False)
        st.dataframe(df_log_display, use_container_width=True)
        st.download_button(
            "Download Log CSV",
            data=df_log_display.to_csv(index=False).encode("utf-8"),
            file_name="kpr_event_log.csv",
            mime="text/csv",
        )


with tab_settings:
    st.subheader("Database Pengaturan")
    st.write(
        "Preset yang disimpan di sini akan muncul otomatis di Generator Email."
    )
    settings_tabs = st.tabs(
        ["Email CC", "Email Pengirim", "Email Bank Tujuan", "Komisi", "Penutup"]
    )
    settings_categories = ["Email CC", "Email Pengirim", "Email Bank Tujuan", "Komisi", "Penutup"]

    for settings_tab, kategori in zip(settings_tabs, settings_categories):
        with settings_tab:
            render_settings_category_tab(kategori, df_settings, ws_settings)
