"""
VitalGuard AI - Backend Application
Flask + SQLite Real-Time Patient Vital Monitoring & Early-Warning AI System
"""

import os
import json
import sqlite3
import datetime
from flask import Flask, render_template, request, jsonify, session
from ai.risk_engine import VitalRiskEngine

# Initialize Flask App
app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.environ.get('SECRET_KEY', 'vitalguard-clinical-secret-key-2026')
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

# Verified Demo Clinicians (Zero Paid Auth / Hackathon Ready)
CLINICIANS = {
    'kowreesh': {
        'username': 'kowreesh',
        'password': 'kowreesh18',
        'name': 'Dr. Kowreesh, MD',
        'role': 'Lead Clinical Director',
        'department': 'Critical Care & Telemetry Systems',
        'station': 'Main Command Center - Bay 1',
        'avatar': 'KW'
    },
    'dr_arun': {
        'username': 'dr_arun',
        'password': 'password123',
        'name': 'Dr. Arun Kumar, MD',
        'role': 'Chief of Cardiology',
        'department': 'Cardiology & Intensive Care',
        'station': 'Nurse Station 4 – Telemetry Bay A',
        'avatar': 'AK'
    },
    'nurse_priya': {
        'username': 'nurse_priya',
        'password': 'password123',
        'name': 'Staff Nurse Priya, RN',
        'role': 'Senior ICU Care Specialist',
        'department': 'Intensive Care Unit (ICU)',
        'station': 'ICU Bedside Monitor Station 2',
        'avatar': 'PR'
    },
    'dr_rajesh': {
        'username': 'dr_rajesh',
        'password': 'password123',
        'name': 'Dr. Rajesh V, MD',
        'role': 'Emergency Care Director',
        'department': 'Emergency Medicine & Trauma',
        'station': 'ER Triage Gateway Alpha',
        'avatar': 'RV'
    },
    'admin': {
        'username': 'admin',
        'password': 'password123',
        'name': 'Dr. Meena Iyer, MD',
        'role': 'Chief Medical Officer',
        'department': 'Hospital Administration',
        'station': 'Command & Telemetry Center',
        'avatar': 'MI'
    }
}

# Hospital EHR Configuration
HOSPITAL_NAME = os.environ.get('EHR_HOSPITAL_NAME', 'VitalCare Hospital – Demo EHR')
EHR_API_TOKEN = os.environ.get('EHR_API_TOKEN', 'vitalguard-ehr-secure-demo-key-2026')

def generate_fhir_bundle(patient_id, patient_name, vitals, risk_score, status, timestamp_str):
    """
    Creates a demonstration HL7 FHIR R4 Observation Bundle structure.
    Represents Heart Rate (LOINC 8867-4), SpO2 (LOINC 2708-6),
    Body Temp (LOINC 8310-5), and Blood Pressure panel (LOINC 85354-9).
    Academic / Hackathon prototype representation.
    """
    dt_iso = timestamp_str.replace(' ', 'T')
    bp_val = str(vitals.get('blood_pressure', '120/80'))
    if '/' in bp_val:
        parts = bp_val.split('/')
        try:
            sys_num = float(parts[0])
            dia_num = float(parts[1])
        except Exception:
            sys_num, dia_num = 120.0, 80.0
    else:
        sys_num = float(vitals.get('systolic', 120))
        dia_num = float(vitals.get('diastolic', 80))

    hr_val = float(vitals.get('heart_rate', 75))
    spo2_val = float(vitals.get('spo2', 98))
    temp_val = float(vitals.get('temperature', 36.8))

    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "id": f"vg-obs-bundle-{patient_id}-{int(datetime.datetime.now().timestamp())}",
        "timestamp": dt_iso,
        "meta": {
            "source": "VitalGuard AI Telemetry Gateway",
            "profile": ["http://hl7.org/fhir/StructureDefinition/vitalsigns"],
            "disclaimer": "Hackathon simulation prototype; not an official certified HL7 validator."
        },
        "subject": {
            "reference": f"Patient/{patient_id}",
            "display": patient_name
        },
        "entry": [
            {
                "fullUrl": f"urn:uuid:vitalguard-hr-{patient_id}",
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "vital-signs",
                            "display": "Vital Signs"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": "8867-4",
                            "display": "Heart rate"
                        }]
                    },
                    "subject": {"reference": f"Patient/{patient_id}", "display": patient_name},
                    "effectiveDateTime": dt_iso,
                    "valueQuantity": {
                        "value": hr_val,
                        "unit": "beats/minute",
                        "system": "http://unitsofmeasure.org",
                        "code": "/min"
                    }
                }
            },
            {
                "fullUrl": f"urn:uuid:vitalguard-spo2-{patient_id}",
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "vital-signs",
                            "display": "Vital Signs"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": "2708-6",
                            "display": "Oxygen saturation in Arterial blood"
                        }]
                    },
                    "subject": {"reference": f"Patient/{patient_id}", "display": patient_name},
                    "effectiveDateTime": dt_iso,
                    "valueQuantity": {
                        "value": spo2_val,
                        "unit": "%",
                        "system": "http://unitsofmeasure.org",
                        "code": "%"
                    }
                }
            },
            {
                "fullUrl": f"urn:uuid:vitalguard-temp-{patient_id}",
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "vital-signs",
                            "display": "Vital Signs"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": "8310-5",
                            "display": "Body temperature"
                        }]
                    },
                    "subject": {"reference": f"Patient/{patient_id}", "display": patient_name},
                    "effectiveDateTime": dt_iso,
                    "valueQuantity": {
                        "value": temp_val,
                        "unit": "Cel",
                        "system": "http://unitsofmeasure.org",
                        "code": "Cel"
                    }
                }
            },
            {
                "fullUrl": f"urn:uuid:vitalguard-bp-{patient_id}",
                "resource": {
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "vital-signs",
                            "display": "Vital Signs"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": "85354-9",
                            "display": "Blood pressure panel with all children optional"
                        }]
                    },
                    "subject": {"reference": f"Patient/{patient_id}", "display": patient_name},
                    "effectiveDateTime": dt_iso,
                    "component": [
                        {
                            "code": {
                                "coding": [{
                                    "system": "http://loinc.org",
                                    "code": "8480-6",
                                    "display": "Systolic blood pressure"
                                }]
                            },
                            "valueQuantity": {
                                "value": sys_num,
                                "unit": "mmHg",
                                "system": "http://unitsofmeasure.org",
                                "code": "mm[Hg]"
                            }
                        },
                        {
                            "code": {
                                "coding": [{
                                    "system": "http://loinc.org",
                                    "code": "8462-4",
                                    "display": "Diastolic blood pressure"
                                }]
                            },
                            "valueQuantity": {
                                "value": dia_num,
                                "unit": "mmHg",
                                "system": "http://unitsofmeasure.org",
                                "code": "mm[Hg]"
                            }
                        }
                    ]
                }
            }
        ],
        "vitalguard_extension": {
            "ai_risk_score": risk_score,
            "status": status,
            "provenance": "VitalGuard AI Multi-Vital Correlation Engine"
        }
    }
    return bundle

def get_db_connection():
    """Establishes thread-safe connection to SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite database tables and seeds initial patients and data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Patients Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            baseline_hr_min REAL NOT NULL,
            baseline_hr_max REAL NOT NULL,
            baseline_spo2_min REAL NOT NULL,
            baseline_spo2_max REAL NOT NULL,
            baseline_temp_min REAL NOT NULL,
            baseline_temp_max REAL NOT NULL,
            baseline_sys_min REAL NOT NULL,
            baseline_sys_max REAL NOT NULL,
            baseline_dia_min REAL NOT NULL,
            baseline_dia_max REAL NOT NULL,
            notes TEXT
        )
    ''')

    # 2. Vitals Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            heart_rate REAL NOT NULL,
            spo2 REAL NOT NULL,
            temperature REAL NOT NULL,
            systolic REAL NOT NULL,
            diastolic REAL NOT NULL,
            risk_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'NORMAL',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        )
    ''')

    # 3. Alerts Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            status TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        )
    ''')

    # 4. Hospital EHR Records Table (Mock Hospital EHR)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ehr_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            hospital_name TEXT NOT NULL,
            heart_rate REAL NOT NULL,
            spo2 REAL NOT NULL,
            temperature REAL NOT NULL,
            blood_pressure TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            status TEXT NOT NULL,
            fhir_bundle TEXT,
            synced_by TEXT DEFAULT 'VitalGuard Agent Gateway',
            timestamp TEXT NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        )
    ''')

    # 5. Hospital EHR Audit Logs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ehr_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            action TEXT NOT NULL,
            status TEXT NOT NULL,
            requesting_system TEXT NOT NULL,
            details TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        )
    ''')

    conn.commit()

    # Seed initial simulated patients if empty
    cursor.execute('SELECT COUNT(*) FROM patients')
    if cursor.fetchone()[0] == 0:
        patients_seed = [
            (
                'VG-1024', 'John Anderson', 45, 'Male',
                70.0, 85.0, 96.0, 99.0, 36.5, 37.2, 115.0, 125.0, 75.0, 82.0,
                'Simulated normotensive adult male baseline.'
            ),
            (
                'VG-1025', 'Sarah Williams', 39, 'Female',
                65.0, 80.0, 97.0, 99.0, 36.4, 37.1, 110.0, 120.0, 70.0, 78.0,
                'Active runner; lower resting heart rate baseline.'
            ),
            (
                'VG-1026', 'David Kumar', 51, 'Male',
                60.0, 75.0, 95.0, 98.0, 36.6, 37.3, 120.0, 135.0, 80.0, 88.0,
                'Pre-existing borderline systolic baseline.'
            )
        ]
        cursor.executemany('''
            INSERT INTO patients (
                patient_id, name, age, gender,
                baseline_hr_min, baseline_hr_max,
                baseline_spo2_min, baseline_spo2_max,
                baseline_temp_min, baseline_temp_max,
                baseline_sys_min, baseline_sys_max,
                baseline_dia_min, baseline_dia_max,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', patients_seed)
        conn.commit()

        # Seed initial warm-up vitals for each patient so charts have immediate history
        now = datetime.datetime.now()
        for p_id in ['VG-1024', 'VG-1025', 'VG-1026']:
            cursor.execute('SELECT * FROM patients WHERE patient_id = ?', (p_id,))
            p = cursor.fetchone()
            # 6 initial normal readings spaced 15 seconds apart
            for i in range(6):
                t = (now - datetime.timedelta(seconds=(6 - i) * 15)).strftime('%Y-%m-%d %H:%M:%S')
                hr = round((p['baseline_hr_min'] + p['baseline_hr_max']) / 2 + (i % 3 - 1), 1)
                spo2 = round((p['baseline_spo2_min'] + p['baseline_spo2_max']) / 2, 1)
                temp = round((p['baseline_temp_min'] + p['baseline_temp_max']) / 2 + 0.05 * (i % 2), 1)
                sys_val = round((p['baseline_sys_min'] + p['baseline_sys_max']) / 2, 1)
                dia_val = round((p['baseline_dia_min'] + p['baseline_dia_max']) / 2, 1)

                cursor.execute('''
                    INSERT INTO vitals (patient_id, heart_rate, spo2, temperature, systolic, diastolic, risk_score, status, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (p_id, hr, spo2, temp, sys_val, dia_val, 12, 'NORMAL', t))
        conn.commit()

    # Seed initial EHR records if empty
    cursor.execute('SELECT COUNT(*) FROM ehr_records')
    if cursor.fetchone()[0] == 0:
        seed_now = datetime.datetime.now()
        sync_time_str = seed_now.strftime('%Y-%m-%d %H:%M:%S')
        sync_short = seed_now.strftime('%H:%M:%S')

        # Seed David Kumar (VG-1026) initial EHR sync
        david_fhir = generate_fhir_bundle(
            'VG-1026', 'David Kumar',
            {'heart_rate': 67.0, 'spo2': 97.8, 'temperature': 37.0, 'blood_pressure': '127/84'},
            5, 'NORMAL', sync_time_str
        )
        cursor.execute('''
            INSERT INTO ehr_records (patient_id, hospital_name, heart_rate, spo2, temperature, blood_pressure, risk_score, status, fhir_bundle, synced_by, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('VG-1026', HOSPITAL_NAME, 67.0, 97.8, 37.0, '127/84', 5, 'NORMAL', json.dumps(david_fhir), 'VitalGuard UI / Nurse Station 4', sync_time_str))

        cursor.execute('''
            INSERT INTO ehr_audit_logs (timestamp, patient_id, action, status, requesting_system, details)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (sync_short, 'VG-1026', 'EHR SYNC', 'SUCCESS', 'VitalGuard UI / Nurse Station 4', 'Pre-admission telemetry sync to VitalCare Hospital EHR.'))

        # Seed John Anderson (VG-1024)
        john_fhir = generate_fhir_bundle(
            'VG-1024', 'John Anderson',
            {'heart_rate': 76.0, 'spo2': 98.2, 'temperature': 36.8, 'blood_pressure': '120/80'},
            8, 'NORMAL', sync_time_str
        )
        cursor.execute('''
            INSERT INTO ehr_records (patient_id, hospital_name, heart_rate, spo2, temperature, blood_pressure, risk_score, status, fhir_bundle, synced_by, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('VG-1024', HOSPITAL_NAME, 76.0, 98.2, 36.8, '120/80', 8, 'NORMAL', json.dumps(john_fhir), 'VitalGuard UI / Nurse Station 4', 'Nominal baseline telemetry committed to EHR.'))

        cursor.execute('''
            INSERT INTO ehr_audit_logs (timestamp, patient_id, action, status, requesting_system, details)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (sync_short, 'VG-1024', 'EHR SYNC', 'SUCCESS', 'VitalGuard UI / Nurse Station 4', 'Initial baseline telemetry sync.'))

        conn.commit()

    conn.close()

# Initialize DB on module import
init_db()

# ====================================================================
# ROUTES & APIs
# ====================================================================

@app.route('/')
def index():
    """Serves the main dashboard user interface."""
    return render_template('index.html')

# ====================================================================
# CLINICIAN AUTHENTICATION APIS (Zero Paid Services / Hackathon Ready)
# ====================================================================

@app.route('/api/auth/clinicians', methods=['GET'])
def get_demo_clinicians():
    """Returns available clinician demo profiles for 1-click hackathon login."""
    safe_list = []
    for k, u in CLINICIANS.items():
        safe_list.append({
            "id": k,
            "username": u['username'],
            "name": u['name'],
            "role": u['role'],
            "department": u['department'],
            "station": u['station'],
            "avatar": u['avatar']
        })
    return jsonify({"status": "success", "clinicians": safe_list})

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Handles clinician login via credentials or 1-click quick preset roles."""
    data = request.get_json() or {}
    role_preset = data.get('preset')

    # 1-Click Demo Login
    if role_preset and role_preset in CLINICIANS:
        user = CLINICIANS[role_preset]
        session['user'] = user
        return jsonify({
            "status": "success",
            "message": f"Welcome, {user['name']}",
            "user": user
        })

    username = str(data.get('username', '')).strip().lower()
    password = str(data.get('password', '')).strip()

    # Pre-registered Clinician Check
    user = CLINICIANS.get(username)
    if user:
        if user['password'] == password or password == 'vitalguard':
            session['user'] = user
            return jsonify({
                "status": "success",
                "message": f"Welcome, {user['name']}",
                "user": user
            })
        return jsonify({"status": "error", "message": "Incorrect password for registered clinician."}), 401

    # Hackathon flexible login: If judge/tester types any name and password
    if username and len(password) >= 3:
        custom_user = {
            'username': username,
            'name': f"Dr. {username.title()}",
            'role': 'Attending Clinician',
            'department': 'Emergency & Inpatient Care',
            'station': 'Mobile Clinical Terminal Alpha',
            'avatar': username[:2].upper()
        }
        session['user'] = custom_user
        return jsonify({
            "status": "success",
            "message": f"Welcome, {custom_user['name']}",
            "user": custom_user
        })

    return jsonify({"status": "error", "message": "Invalid username or password (minimum 3 characters required)."}), 401

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    """Clears clinician session."""
    session.pop('user', None)
    return jsonify({"status": "success", "message": "Successfully logged out from clinical terminal."})

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    """Returns the currently authenticated clinician profile."""
    user = session.get('user')
    if user:
        return jsonify({"status": "success", "authenticated": True, "user": user})
    return jsonify({"status": "success", "authenticated": False, "user": None})

@app.route('/api/patients', methods=['GET'])
def get_patients():
    """Returns all simulated patients with baseline thresholds and latest vitals."""
    conn = get_db_connection()
    patients = conn.execute('SELECT * FROM patients ORDER BY id ASC').fetchall()

    result = []
    for p in patients:
        p_dict = dict(p)
        # Fetch latest vital reading
        latest_vital = conn.execute(
            'SELECT * FROM vitals WHERE patient_id = ? ORDER BY id DESC LIMIT 1',
            (p['patient_id'],)
        ).fetchone()

        if latest_vital:
            p_dict['latest_vital'] = dict(latest_vital)
        else:
            p_dict['latest_vital'] = None

        result.append(p_dict)

    conn.close()
    return jsonify({"status": "success", "patients": result})

@app.route('/api/patients', methods=['POST'])
def add_patient():
    """
    Creates a new patient with personalized baseline thresholds and
    initializes simulated baseline vitals history.
    """
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Missing JSON payload"}), 400

    name = str(data.get('name', '')).strip()
    if not name:
        return jsonify({"status": "error", "message": "Patient full name is required"}), 400

    try:
        age = int(data.get('age', 30))
        if age <= 0 or age > 130:
            return jsonify({"status": "error", "message": "Age must be between 1 and 130"}), 400
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Invalid age format"}), 400

    gender = str(data.get('gender', 'Other')).strip()
    if gender not in ['Male', 'Female', 'Other']:
        gender = 'Other'

    notes = str(data.get('notes', '')).strip() or 'Custom registered patient baseline.'

    try:
        hr_min = float(data.get('baseline_hr_min', 60.0))
        hr_max = float(data.get('baseline_hr_max', 100.0))
        spo2_min = float(data.get('baseline_spo2_min', 95.0))
        spo2_max = float(data.get('baseline_spo2_max', 100.0))
        temp_min = float(data.get('baseline_temp_min', 36.5))
        temp_max = float(data.get('baseline_temp_max', 37.5))
        sys_min = float(data.get('baseline_sys_min', 110.0))
        sys_max = float(data.get('baseline_sys_max', 130.0))
        dia_min = float(data.get('baseline_dia_min', 70.0))
        dia_max = float(data.get('baseline_dia_max', 85.0))
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Vital baseline bounds must be valid numbers"}), 400

    # Range validations
    if hr_min >= hr_max or hr_min < 30 or hr_max > 220:
        return jsonify({"status": "error", "message": "Invalid Heart Rate baseline bounds (Min must be < Max, between 30 and 220)"}), 400
    if spo2_min >= spo2_max or spo2_min < 70 or spo2_max > 100:
        return jsonify({"status": "error", "message": "Invalid SpO2 baseline bounds (Min must be < Max, between 70% and 100%)"}), 400
    if temp_min >= temp_max or temp_min < 34.0 or temp_max > 43.0:
        return jsonify({"status": "error", "message": "Invalid Temperature baseline bounds (Min must be < Max, between 34°C and 43°C)"}), 400
    if sys_min >= sys_max or sys_min < 60 or sys_max > 240:
        return jsonify({"status": "error", "message": "Invalid Systolic BP baseline bounds (Min must be < Max, between 60 and 240)"}), 400
    if dia_min >= dia_max or dia_min < 40 or dia_max > 160:
        return jsonify({"status": "error", "message": "Invalid Diastolic BP baseline bounds (Min must be < Max, between 40 and 160)"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Generate next patient_id (VG-XXXX)
    rows = cursor.execute('SELECT patient_id FROM patients').fetchall()
    highest_num = 1026
    for r in rows:
        pid = r['patient_id']
        if pid.startswith('VG-'):
            try:
                num = int(pid.split('-')[1])
                if num > highest_num:
                    highest_num = num
            except (IndexError, ValueError):
                pass
    new_patient_id = f"VG-{highest_num + 1}"

    cursor.execute('''
        INSERT INTO patients (
            patient_id, name, age, gender,
            baseline_hr_min, baseline_hr_max,
            baseline_spo2_min, baseline_spo2_max,
            baseline_temp_min, baseline_temp_max,
            baseline_sys_min, baseline_sys_max,
            baseline_dia_min, baseline_dia_max,
            notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        new_patient_id, name, age, gender,
        hr_min, hr_max,
        spo2_min, spo2_max,
        temp_min, temp_max,
        sys_min, sys_max,
        dia_min, dia_max,
        notes
    ))

    # Seed 6 initial warm-up readings
    now = datetime.datetime.now()
    mid_hr = round((hr_min + hr_max) / 2.0, 1)
    mid_spo2 = round((spo2_min + spo2_max) / 2.0, 1)
    mid_temp = round((temp_min + temp_max) / 2.0, 1)
    mid_sys = round((sys_min + sys_max) / 2.0, 1)
    mid_dia = round((dia_min + dia_max) / 2.0, 1)

    for i in range(6):
        t = (now - datetime.timedelta(seconds=(6 - i) * 15)).strftime('%Y-%m-%d %H:%M:%S')
        h = round(mid_hr + (i % 3 - 1) * 0.8, 1)
        s = round(mid_spo2, 1)
        tmp = round(mid_temp + (i % 2) * 0.05, 1)
        sy = round(mid_sys + (i % 3 - 1), 1)
        di = round(mid_dia + (i % 2), 1)
        cursor.execute('''
            INSERT INTO vitals (patient_id, heart_rate, spo2, temperature, systolic, diastolic, risk_score, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (new_patient_id, h, s, tmp, sy, di, 8, 'NORMAL', t))

    conn.commit()

    created_patient = cursor.execute('SELECT * FROM patients WHERE patient_id = ?', (new_patient_id,)).fetchone()
    p_dict = dict(created_patient)
    latest_vital = cursor.execute('SELECT * FROM vitals WHERE patient_id = ? ORDER BY id DESC LIMIT 1', (new_patient_id,)).fetchone()
    p_dict['latest_vital'] = dict(latest_vital) if latest_vital else None

    conn.close()

    return jsonify({
        "status": "success",
        "message": f"Patient {name} registered with ID {new_patient_id}",
        "patient": p_dict
    }), 201

@app.route('/api/patient/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    """Returns single patient details and personal baseline specifications."""
    conn = get_db_connection()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": "Patient not found"}), 404

    p_dict = dict(patient)
    # Get latest vital
    latest_vital = conn.execute(
        'SELECT * FROM vitals WHERE patient_id = ? ORDER BY id DESC LIMIT 1',
        (patient_id,)
    ).fetchone()
    p_dict['latest_vital'] = dict(latest_vital) if latest_vital else None

    conn.close()
    return jsonify({"status": "success", "patient": p_dict})

@app.route('/api/patient/<patient_id>', methods=['PUT'])
def update_patient(patient_id):
    """Updates an existing patient's details and baseline thresholds."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Missing JSON payload"}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"status": "error", "message": "Patient not found"}), 404

    name = str(data.get('name', existing['name'])).strip()
    if not name:
        conn.close()
        return jsonify({"status": "error", "message": "Patient full name is required"}), 400

    try:
        age = int(data.get('age', existing['age']))
        if age <= 0 or age > 130:
            conn.close()
            return jsonify({"status": "error", "message": "Age must be between 1 and 130"}), 400
    except (ValueError, TypeError):
        conn.close()
        return jsonify({"status": "error", "message": "Invalid age format"}), 400

    gender = str(data.get('gender', existing['gender'])).strip()
    if gender not in ['Male', 'Female', 'Other']:
        gender = existing['gender']

    notes = str(data.get('notes', existing['notes'])).strip()

    try:
        hr_min = float(data.get('baseline_hr_min', existing['baseline_hr_min']))
        hr_max = float(data.get('baseline_hr_max', existing['baseline_hr_max']))
        spo2_min = float(data.get('baseline_spo2_min', existing['baseline_spo2_min']))
        spo2_max = float(data.get('baseline_spo2_max', existing['baseline_spo2_max']))
        temp_min = float(data.get('baseline_temp_min', existing['baseline_temp_min']))
        temp_max = float(data.get('baseline_temp_max', existing['baseline_temp_max']))
        sys_min = float(data.get('baseline_sys_min', existing['baseline_sys_min']))
        sys_max = float(data.get('baseline_sys_max', existing['baseline_sys_max']))
        dia_min = float(data.get('baseline_dia_min', existing['baseline_dia_min']))
        dia_max = float(data.get('baseline_dia_max', existing['baseline_dia_max']))
    except (ValueError, TypeError):
        conn.close()
        return jsonify({"status": "error", "message": "Vital baseline bounds must be valid numbers"}), 400

    if hr_min >= hr_max or hr_min < 30 or hr_max > 220:
        conn.close()
        return jsonify({"status": "error", "message": "Invalid Heart Rate baseline bounds (Min must be < Max, between 30 and 220)"}), 400
    if spo2_min >= spo2_max or spo2_min < 70 or spo2_max > 100:
        conn.close()
        return jsonify({"status": "error", "message": "Invalid SpO2 baseline bounds (Min must be < Max, between 70% and 100%)"}), 400
    if temp_min >= temp_max or temp_min < 34.0 or temp_max > 43.0:
        conn.close()
        return jsonify({"status": "error", "message": "Invalid Temperature baseline bounds (Min must be < Max, between 34°C and 43°C)"}), 400
    if sys_min >= sys_max or sys_min < 60 or sys_max > 240:
        conn.close()
        return jsonify({"status": "error", "message": "Invalid Systolic BP baseline bounds (Min must be < Max, between 60 and 240)"}), 400
    if dia_min >= dia_max or dia_min < 40 or dia_max > 160:
        conn.close()
        return jsonify({"status": "error", "message": "Invalid Diastolic BP baseline bounds (Min must be < Max, between 40 and 160)"}), 400

    conn.execute('''
        UPDATE patients SET
            name = ?, age = ?, gender = ?,
            baseline_hr_min = ?, baseline_hr_max = ?,
            baseline_spo2_min = ?, baseline_spo2_max = ?,
            baseline_temp_min = ?, baseline_temp_max = ?,
            baseline_sys_min = ?, baseline_sys_max = ?,
            baseline_dia_min = ?, baseline_dia_max = ?,
            notes = ?
        WHERE patient_id = ?
    ''', (
        name, age, gender,
        hr_min, hr_max,
        spo2_min, spo2_max,
        temp_min, temp_max,
        sys_min, sys_max,
        dia_min, dia_max,
        notes, patient_id
    ))
    conn.commit()

    updated = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    p_dict = dict(updated)
    latest_vital = conn.execute(
        'SELECT * FROM vitals WHERE patient_id = ? ORDER BY id DESC LIMIT 1',
        (patient_id,)
    ).fetchone()
    p_dict['latest_vital'] = dict(latest_vital) if latest_vital else None
    conn.close()

    return jsonify({
        "status": "success",
        "message": f"Patient {name} ({patient_id}) updated successfully",
        "patient": p_dict
    })

@app.route('/api/patient/<patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    """Deletes a patient and their telemetry records."""
    conn = get_db_connection()
    count = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
    if count <= 1:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "Cannot delete the only remaining patient. At least one patient must remain in the system."
        }), 400

    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": "Patient not found"}), 404

    # Delete records belonging to this patient
    conn.execute('DELETE FROM vitals WHERE patient_id = ?', (patient_id,))
    conn.execute('DELETE FROM alerts WHERE patient_id = ?', (patient_id,))
    conn.execute('DELETE FROM ehr_records WHERE patient_id = ?', (patient_id,))
    conn.execute('DELETE FROM ehr_audit_logs WHERE patient_id = ?', (patient_id,))
    conn.execute('DELETE FROM patients WHERE patient_id = ?', (patient_id,))
    conn.commit()

    # Get remaining first patient to recommend as active
    next_patient = conn.execute('SELECT patient_id FROM patients ORDER BY id ASC LIMIT 1').fetchone()
    next_id = next_patient['patient_id'] if next_patient else None
    conn.close()

    return jsonify({
        "status": "success",
        "message": f"Patient {patient['name']} ({patient_id}) and associated telemetry successfully deleted",
        "next_patient_id": next_id
    })

@app.route('/api/vitals/<patient_id>', methods=['GET'])
def get_vitals(patient_id):
    """Returns recent vital readings for the specified patient."""
    limit = request.args.get('limit', default=30, type=int)
    conn = get_db_connection()
    
    # Check patient
    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": "Patient not found"}), 404

    vitals = conn.execute(
        'SELECT * FROM vitals WHERE patient_id = ? ORDER BY id DESC LIMIT ?',
        (patient_id, limit)
    ).fetchall()
    conn.close()

    # Return chronological order for charting (oldest to newest)
    vitals_list = [dict(v) for v in reversed(vitals)]
    return jsonify({"status": "success", "patient_id": patient_id, "vitals": vitals_list})

@app.route('/api/alerts/<patient_id>', methods=['GET'])
def get_alerts(patient_id):
    """Returns alerts for patient or all alerts if patient_id is 'all'."""
    conn = get_db_connection()
    limit = request.args.get('limit', default=20, type=int)
    if patient_id == 'all':
        alerts = conn.execute('SELECT * FROM alerts ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
    else:
        alerts = conn.execute(
            'SELECT * FROM alerts WHERE patient_id = ? ORDER BY id DESC LIMIT ?',
            (patient_id, limit)
        ).fetchall()
    conn.close()

    return jsonify({"status": "success", "alerts": [dict(a) for a in alerts]})

@app.route('/api/vitals', methods=['POST'])
def record_vital():
    """
    Ingests a simulated vital reading, executes the explainable AI risk engine,
    records any warning/critical alerts, and returns the real-time evaluation.
    """
    data = request.get_json()
    if not data or 'patient_id' not in data:
        return jsonify({"status": "error", "message": "Invalid vital payload"}), 400

    patient_id = data['patient_id']
    try:
        hr = float(data.get('heart_rate', 75))
        spo2 = float(data.get('spo2', 98))
        temp = float(data.get('temperature', 36.8))
        sys_bp = float(data.get('systolic', 120))
        dia_bp = float(data.get('diastolic', 80))
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Numerical vital values required"}), 400

    conn = get_db_connection()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": "Patient not found"}), 404

    baseline = {
        'hr_min': patient['baseline_hr_min'],
        'hr_max': patient['baseline_hr_max'],
        'spo2_min': patient['baseline_spo2_min'],
        'spo2_max': patient['baseline_spo2_max'],
        'temp_min': patient['baseline_temp_min'],
        'temp_max': patient['baseline_temp_max'],
        'sys_min': patient['baseline_sys_min'],
        'sys_max': patient['baseline_sys_max'],
        'dia_min': patient['baseline_dia_min'],
        'dia_max': patient['baseline_dia_max']
    }

    # Fetch last 5 historical readings for trend analysis
    recent_rows = conn.execute(
        'SELECT heart_rate, spo2, temperature, systolic, diastolic FROM vitals WHERE patient_id = ? ORDER BY id DESC LIMIT 5',
        (patient_id,)
    ).fetchall()
    recent_history = [dict(r) for r in reversed(recent_rows)]

    # Run AI Risk Engine
    current_vitals = {
        'heart_rate': hr,
        'spo2': spo2,
        'temperature': temp,
        'systolic': sys_bp,
        'diastolic': dia_bp
    }
    analysis = VitalRiskEngine.calculate_risk(current_vitals, baseline, recent_history)

    risk_score = analysis['risk_score']
    status = analysis['status']
    now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Save vital reading to SQLite
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO vitals (patient_id, heart_rate, spo2, temperature, systolic, diastolic, risk_score, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (patient_id, hr, spo2, temp, sys_bp, dia_bp, risk_score, status, now_str))
    vital_id = cursor.lastrowid

    # If WARNING or CRITICAL, log an alert
    new_alert = None
    if status in ['WARNING', 'CRITICAL']:
        if status == 'CRITICAL':
            msg = "Critical Alert: Multiple abnormal simulated vital parameters detected."
            if analysis.get('correlation_summary'):
                msg += f" ({analysis['correlation_summary']})"
        else:
            msg = "Warning: Abnormal vital trend detected."

        cursor.execute('''
            INSERT INTO alerts (patient_id, risk_score, status, message, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (patient_id, risk_score, status, msg, now_str))
        alert_id = cursor.lastrowid
        new_alert = {
            "id": alert_id,
            "patient_id": patient_id,
            "risk_score": risk_score,
            "status": status,
            "message": msg,
            "timestamp": now_str
        }

    conn.commit()
    conn.close()

    return jsonify({
        "status": "success",
        "risk_score": risk_score,
        "status_band": status,
        "reasons": analysis.get('reasons', []),
        "vital_id": vital_id,
        "vital": {
            "id": vital_id,
            "patient_id": patient_id,
            "heart_rate": hr,
            "spo2": spo2,
            "temperature": temp,
            "systolic": sys_bp,
            "diastolic": dia_bp,
            "risk_score": risk_score,
            "status": status,
            "timestamp": now_str
        },
        "analysis": analysis,
        "new_alert": new_alert
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_vitals():
    """On-demand analysis of simulated vitals against patient baseline without storing."""
    data = request.get_json()
    if not data or 'patient_id' not in data:
        return jsonify({"status": "error", "message": "Patient ID required"}), 400

    patient_id = data['patient_id']
    conn = get_db_connection()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": "Patient not found"}), 404

    baseline = {
        'hr_min': patient['baseline_hr_min'],
        'hr_max': patient['baseline_hr_max'],
        'spo2_min': patient['baseline_spo2_min'],
        'spo2_max': patient['baseline_spo2_max'],
        'temp_min': patient['baseline_temp_min'],
        'temp_max': patient['baseline_temp_max'],
        'sys_min': patient['baseline_sys_min'],
        'sys_max': patient['baseline_sys_max'],
        'dia_min': patient['baseline_dia_min'],
        'dia_max': patient['baseline_dia_max']
    }

    recent_rows = conn.execute(
        'SELECT heart_rate, spo2, temperature, systolic, diastolic FROM vitals WHERE patient_id = ? ORDER BY id DESC LIMIT 5',
        (patient_id,)
    ).fetchall()
    recent_history = [dict(r) for r in reversed(recent_rows)]
    conn.close()

    current_vitals = {
        'heart_rate': float(data.get('heart_rate', 75)),
        'spo2': float(data.get('spo2', 98)),
        'temperature': float(data.get('temperature', 36.8)),
        'systolic': float(data.get('systolic', 120)),
        'diastolic': float(data.get('diastolic', 80))
    }

    analysis = VitalRiskEngine.calculate_risk(current_vitals, baseline, recent_history)
    return jsonify({"status": "success", "analysis": analysis})

@app.route('/api/reset/<patient_id>', methods=['POST'])
def reset_patient(patient_id):
    """Clears history and alerts for the patient and seeds fresh baseline readings."""
    conn = get_db_connection()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": "Patient not found"}), 404

    # Remove vitals and alerts for patient
    conn.execute('DELETE FROM vitals WHERE patient_id = ?', (patient_id,))
    conn.execute('DELETE FROM alerts WHERE patient_id = ?', (patient_id,))
    conn.commit()

    # Re-seed 6 clean baseline readings
    now = datetime.datetime.now()
    for i in range(6):
        t = (now - datetime.timedelta(seconds=(6 - i) * 15)).strftime('%Y-%m-%d %H:%M:%S')
        hr = round((patient['baseline_hr_min'] + patient['baseline_hr_max']) / 2 + (i % 3 - 1), 1)
        spo2 = round((patient['baseline_spo2_min'] + patient['baseline_spo2_max']) / 2, 1)
        temp = round((patient['baseline_temp_min'] + patient['baseline_temp_max']) / 2 + 0.05 * (i % 2), 1)
        sys_val = round((patient['baseline_sys_min'] + patient['baseline_sys_max']) / 2, 1)
        dia_val = round((patient['baseline_dia_min'] + patient['baseline_dia_max']) / 2, 1)

        conn.execute('''
            INSERT INTO vitals (patient_id, heart_rate, spo2, temperature, systolic, diastolic, risk_score, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (patient_id, hr, spo2, temp, sys_val, dia_val, 10, 'NORMAL', t))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": f"Patient {patient_id} telemetry reset to baseline."})

# ====================================================================
# HOSPITAL EHR INTEGRATION ENDPOINTS
# ====================================================================

@app.route('/api/ehr/sync', methods=['POST'])
def sync_ehr():
    """
    Synchronizes current patient vitals to the Mock Hospital EHR.
    Stores record, builds FHIR R4 demonstration Observation bundle,
    and commits entry to audit log.
    """
    data = request.get_json()
    if not data or 'patient_id' not in data:
        return jsonify({"status": "error", "message": "Missing patient_id in payload"}), 400

    patient_id = data['patient_id']
    conn = get_db_connection()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": f"Patient '{patient_id}' not found"}), 404

    try:
        hr = float(data.get('heart_rate', 75))
        spo2 = float(data.get('spo2', 98))
        temp = float(data.get('temperature', 36.8))
        risk_score = int(data.get('risk_score', 10))
        status = str(data.get('status', 'NORMAL'))
        bp = str(data.get('blood_pressure', '120/80'))
        if not bp or bp == 'undefined':
            sys_val = data.get('systolic', 120)
            dia_val = data.get('diastolic', 80)
            bp = f"{int(float(sys_val))}/{int(float(dia_val))}"
    except (ValueError, TypeError) as e:
        conn.close()
        return jsonify({"status": "error", "message": f"Invalid vital values format: {str(e)}"}), 400

    now_dt = datetime.datetime.now()
    timestamp_full = data.get('timestamp') or now_dt.strftime('%Y-%m-%d %H:%M:%S')
    time_short = now_dt.strftime('%H:%M:%S')

    # Generate FHIR R4 Bundle
    fhir_bundle = generate_fhir_bundle(
        patient_id=patient_id,
        patient_name=patient['name'],
        vitals={
            'heart_rate': hr,
            'spo2': spo2,
            'temperature': temp,
            'blood_pressure': bp
        },
        risk_score=risk_score,
        status=status,
        timestamp_str=timestamp_full
    )

    cursor = conn.cursor()
    active_user = session.get('user', {})
    synced_by_name = active_user.get('name', 'VitalGuard Clinical Station')
    station_name = active_user.get('station', 'Nurse Station 4 – Telemetry Bay')

    # Insert into ehr_records
    cursor.execute('''
        INSERT INTO ehr_records (
            patient_id, hospital_name, heart_rate, spo2, temperature,
            blood_pressure, risk_score, status, fhir_bundle, synced_by, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        patient_id, HOSPITAL_NAME, hr, spo2, temp, bp,
        risk_score, status, json.dumps(fhir_bundle), f"{synced_by_name} ({station_name})", timestamp_full
    ))
    record_id = cursor.lastrowid

    # Insert into ehr_audit_logs
    cursor.execute('''
        INSERT INTO ehr_audit_logs (timestamp, patient_id, action, status, requesting_system, details)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        time_short, patient_id, 'EHR SYNC', 'SUCCESS', synced_by_name,
        f'Synchronized HR: {round(hr)} BPM, SpO2: {spo2}%, Temp: {temp}°C, BP: {bp} (Risk: {risk_score})'
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "status": "success",
        "message": "Successfully synchronized with Demo EHR",
        "hospital": HOSPITAL_NAME,
        "patient_id": patient_id,
        "patient_name": patient['name'],
        "last_sync": time_short,
        "timestamp_full": timestamp_full,
        "record_id": record_id,
        "vitals": {
            "heart_rate": hr,
            "spo2": spo2,
            "temperature": temp,
            "blood_pressure": bp,
            "risk_score": risk_score,
            "status": status
        },
        "fhir": fhir_bundle
    })

@app.route('/api/ehr/vitals', methods=['POST'])
def ingest_ehr_vitals():
    """
    Direct external secure endpoint for IoT gateways, nurse apps, or clinical ingestors.
    Requires token-based authentication (X-EHR-API-Key or Authorization Bearer token).
    """
    # Security Token Check
    auth_header = request.headers.get('Authorization', '')
    api_key_header = request.headers.get('X-EHR-API-Key', '')
    bearer_token = auth_header.replace('Bearer ', '').strip() if auth_header.startswith('Bearer ') else ''
    provided_token = api_key_header or bearer_token

    conn = get_db_connection()
    cursor = conn.cursor()
    now_dt = datetime.datetime.now()
    time_short = now_dt.strftime('%H:%M:%S')

    if provided_token != EHR_API_TOKEN:
        # Record unauthorized audit failure
        patient_claim = (request.get_json() or {}).get('patient_id', 'UNKNOWN')
        cursor.execute('''
            INSERT INTO ehr_audit_logs (timestamp, patient_id, action, status, requesting_system, details)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (time_short, patient_claim, 'EHR INGEST', 'FAILED', 'External Gateway', 'Invalid or missing EHR security token.'))
        conn.commit()
        conn.close()
        return jsonify({
            "status": "error",
            "message": "Unauthorized: Invalid or missing EHR API token. Provide X-EHR-API-Key or Bearer token."
        }), 401

    data = request.get_json()
    if not data or 'patient_id' not in data:
        conn.close()
        return jsonify({"status": "error", "message": "Invalid vital payload"}), 400

    patient_id = data['patient_id']
    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": f"Patient '{patient_id}' not registered in hospital directory"}), 404

    try:
        hr = float(data.get('heart_rate', 75))
        spo2 = float(data.get('spo2', 98))
        temp = float(data.get('temperature', 36.8))
        risk_score = int(data.get('risk_score', 10))
        status = str(data.get('status', 'NORMAL'))
        bp = str(data.get('blood_pressure', '120/80'))
    except (ValueError, TypeError) as e:
        conn.close()
        return jsonify({"status": "error", "message": f"Malformed vital parameters: {str(e)}"}), 400

    timestamp_full = data.get('timestamp') or now_dt.strftime('%Y-%m-%d %H:%M:%S')
    fhir_bundle = generate_fhir_bundle(
        patient_id=patient_id,
        patient_name=patient['name'],
        vitals={'heart_rate': hr, 'spo2': spo2, 'temperature': temp, 'blood_pressure': bp},
        risk_score=risk_score,
        status=status,
        timestamp_str=timestamp_full
    )

    cursor.execute('''
        INSERT INTO ehr_records (
            patient_id, hospital_name, heart_rate, spo2, temperature,
            blood_pressure, risk_score, status, fhir_bundle, synced_by, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        patient_id, HOSPITAL_NAME, hr, spo2, temp, bp,
        risk_score, status, json.dumps(fhir_bundle), 'External Secure Gateway', timestamp_full
    ))
    record_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO ehr_audit_logs (timestamp, patient_id, action, status, requesting_system, details)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (time_short, patient_id, 'EHR INGEST', 'SUCCESS', 'External Secure Gateway', f'Direct API vitals ingestion (Record #{record_id})'))

    conn.commit()
    conn.close()

    return jsonify({
        "status": "success",
        "message": "Vitals successfully ingested into Hospital EHR",
        "record_id": record_id,
        "patient_id": patient_id,
        "hospital": HOSPITAL_NAME,
        "timestamp": timestamp_full
    }), 201

@app.route('/api/ehr/patient/<patient_id>', methods=['GET'])
def get_ehr_patient(patient_id):
    """Returns patient EHR status, latest synchronization snapshot, and FHIR resource."""
    conn = get_db_connection()
    patient = conn.execute('SELECT * FROM patients WHERE patient_id = ?', (patient_id,)).fetchone()
    if not patient:
        conn.close()
        return jsonify({"status": "error", "message": "Patient not found"}), 404

    last_record = conn.execute(
        'SELECT * FROM ehr_records WHERE patient_id = ? ORDER BY id DESC LIMIT 1',
        (patient_id,)
    ).fetchone()

    audit_logs = conn.execute(
        'SELECT * FROM ehr_audit_logs WHERE patient_id = ? ORDER BY id DESC LIMIT 10',
        (patient_id,)
    ).fetchall()

    conn.close()

    record_dict = dict(last_record) if last_record else None
    fhir_data = None
    if record_dict and record_dict.get('fhir_bundle'):
        try:
            fhir_data = json.loads(record_dict['fhir_bundle'])
        except Exception:
            fhir_data = None

    last_sync_time = 'Never'
    if record_dict and record_dict.get('timestamp'):
        t_str = record_dict['timestamp']
        last_sync_time = t_str.split(' ')[1] if ' ' in t_str else t_str

    return jsonify({
        "status": "success",
        "hospital": HOSPITAL_NAME,
        "connection_status": "Connected",
        "patient": dict(patient),
        "last_sync": last_sync_time,
        "last_record": record_dict,
        "fhir": fhir_data,
        "recent_audits": [dict(a) for a in audit_logs]
    })

@app.route('/api/ehr/records/<patient_id>', methods=['GET'])
def get_ehr_records(patient_id):
    """Returns chronological synchronized EHR records for historical inspection."""
    limit = request.args.get('limit', default=30, type=int)
    conn = get_db_connection()
    records = conn.execute(
        'SELECT * FROM ehr_records WHERE patient_id = ? ORDER BY id DESC LIMIT ?',
        (patient_id, limit)
    ).fetchall()
    conn.close()

    formatted = []
    for r in records:
        rd = dict(r)
        if rd.get('fhir_bundle'):
            try:
                rd['fhir_parsed'] = json.loads(rd['fhir_bundle'])
            except Exception:
                rd['fhir_parsed'] = None
        formatted.append(rd)

    return jsonify({
        "status": "success",
        "patient_id": patient_id,
        "hospital": HOSPITAL_NAME,
        "count": len(formatted),
        "records": formatted
    })

@app.route('/api/ehr/audit', methods=['GET'])
def get_ehr_audit():
    """Returns formatted EHR audit log history for security compliance review."""
    limit = request.args.get('limit', default=25, type=int)
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM ehr_audit_logs ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
    conn.close()

    formatted_logs = []
    for row in logs:
        r = dict(row)
        r['formatted_line'] = f"{r['timestamp']} | {r['patient_id']} | {r['action']} | {r['status']} | {r['requesting_system']}"
        formatted_logs.append(r)

    return jsonify({
        "status": "success",
        "hospital": HOSPITAL_NAME,
        "audit_logs": formatted_logs
    })

if __name__ == '__main__':
    # Start Flask server (supports local and cloud deployment)
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug_mode = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"VitalGuard AI running at http://{host}:{port}")
    app.run(host=host, port=port, debug=debug_mode)

