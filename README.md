# 🛡️ VitalGuard AI
### AI-Powered Real-Time Patient Vital Monitoring & Early-Warning System

> **⚠️ ACADEMIC & HACKATHON DISCLAIMER:**  
> VitalGuard AI is an educational simulation prototype built for a 24-hour hackathon. It does **not** diagnose medical conditions, replace clinical devices, or provide medical advice. All physiological vitals are simulated in software.

---

## 🌟 Executive Summary & Value Proposition

In emergency rooms, intensive care units, and ambulatory wards, subtle patient deterioration is frequently detected only after vital signs cross acute physiological emergency thresholds. Generic "one-size-fits-all" alarms lead to severe alarm fatigue, while failing to detect dangerous cross-vital patterns early.

**VitalGuard AI** introduces a **₹0-cost, lightweight, explainable early-warning intelligence system** that:
1. **Personalizes Baselines**: Compares each patient's telemetry against their own resting baseline profile rather than generic rigid population thresholds.
2. **Evaluates Rolling Trends**: Analyzes trajectories over time (e.g., continuous heart rate climbs or gradual oxygen desaturation) before single limits are breached.
3. **Multi-Vital Correlation Engine**: Identifies compounding multi-organ physiological stress (e.g. the acute triad of tachycardia + hypoxia + fever) to prevent impending shock.
4. **100% Zero-Cost & Offline**: Runs entirely on a single laptop using Python, Flask, SQLite, and Vanilla JS, requiring no paid APIs, no cloud subscriptions, and no external hardware to demonstrate.

---

## 🏗️ Technical Architecture

```
                                 [ Web Browser Client ]
                                           │
                 ┌─────────────────────────┼─────────────────────────┐
                 ▼                         ▼                         ▼
         [ Live Telemetry Cards ]   [ Chart.js Trends ]      [ SVG Risk Ring ]
                 │                         │                         │
                 └─────────────────────────┬─────────────────────────┘
                                           │  HTTP POST /api/vitals
                                           ▼
                                 [ Flask Application ]
                                   (app.py - Port 5000)
                                           │
                 ┌─────────────────────────┴─────────────────────────┐
                 ▼                                                   ▼
         [ SQLite Database ]                               [ AI Risk Engine ]
           (database.db)                                   (ai/risk_engine.py)
         • patients table                                  • Baseline Comparison
         • vitals table                                    • Trend Trajectory
         • alerts table                                    • Multi-Vital Correlation
                                                           • Explainable Reasoning
```

---

## ⚡ Technology Stack

| Layer | Technology | Cost | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | HTML5 / CSS3 / Vanilla JavaScript | **₹0** | Cyber-clinical dark healthcare dashboard |
| **Data Visualization** | Chart.js (Bundled locally) | **₹0** | High-frequency telemetry trajectory charts |
| **Audio Synthesis** | Web Audio API | **₹0** | Synthesized alarm chimes (zero audio files) |
| **Backend** | Python 3.x + Flask | **₹0** | High-concurrency RESTful microservice |
| **Database** | SQLite3 (Built-in Python) | **₹0** | Local, zero-configuration audit trail storage |
| **Intelligence** | Deterministic Explainable AI | **₹0** | Multi-vital correlation & personalized baseline engine |

---

## 📂 Project Structure

```
VitalGuard-AI/
│
├── app.py                     # Flask server, SQLite schema, database seeding & APIs
├── requirements.txt           # Minimal Python dependency list (Flask)
├── database.db                # Auto-initialized SQLite database
│
├── ai/
│   └── risk_engine.py         # Explainable AI risk engine (0-100 scoring & rationale)
│
├── templates/
│   └── index.html             # Cyber-clinical telemetry dashboard layout
│
├── static/
│   ├── style.css              # Dark mode hospital design system & animations
│   ├── script.js              # Telemetry drift engine, Chart.js driver, API client
│   └── vendor/
│       └── chart.umd.min.js   # Bundled offline Chart.js library (no CDN required)
│
└── README.md                  # Complete hackathon documentation & demo guide
```

---

## 🚀 Quickstart Installation & Local Setup

VitalGuard AI requires only Python 3.8+ and installs in under 60 seconds.

### 1. Clone or Open Project Directory
```bash
cd VitalGuard-AI
```

### 2. (Optional) Create and Activate Virtual Environment
**On Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```
**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```
*(Or simply: `pip install flask`)*

### 4. Run the Application
```bash
python app.py
```

### 5. Open Dashboard in Browser
Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

*Note: The SQLite database (`database.db`) is initialized and seeded automatically with 3 simulated patients and warm-up telemetry upon first launch.*

---

## 🎬 4-Step Hackathon Presentation Demo Script

Deliver a compelling 3-minute hackathon pitch using the built-in telemetry simulation controls:

### **Step 1: Baseline Normal Telemetry**
- **Action**: Ensure the top control is set to `🟢 Simulate Normal`.
- **What to say**: *"Here we see patient John Anderson (VG-1024). VitalGuard AI has established John's personalized resting baseline (Heart Rate: 70–85 BPM, SpO2: 96–99%). Notice that values fluctuate naturally with physiological Brownian drift, and the AI Risk Score remains low (8–14/100, NORMAL)."*

### **Step 2: Early Warning Physiological Drift**
- **Action**: Click the `🟡 Simulate Warning` button.
- **What to say**: *"Now observe as the patient develops mild physiological drift. Heart rate creeps up to 92 BPM, SpO2 dips to 94.8%, and temperature rises to 37.6°C. The AI Risk Score shifts to Amber WARNING (35–48/100). Crucially, look at the AI Analysis panel: it explicitly explains that heart rate is climbing and SpO2 is sub-baseline before any catastrophic event occurs."*

### **Step 3: Acute Multi-Vital Critical Event**
- **Action**: Click the `🔴 Simulate Critical` button.
- **What to say**: *"Here we simulate acute respiratory compensation and fever distress. Heart rate surges above 115 BPM, SpO2 plummets to 89%, and temperature hits 38.9°C. Instantly, our Multi-Vital Correlation Engine detects this concurrent triad. The AI Risk Score surges to CRITICAL (75–92/100), a prominent Critical Alert banner is triggered, an audible warning sounds, and the event is timestamped into the persistent audit trail."*

### **Step 4: System Reset & Patient Switching**
- **Action**: Click `🔄 Reset` and switch the active patient to **Sarah Williams (VG-1025)** or **David Kumar (VG-1026)**.
- **What to say**: *"With one click on Reset, vitals normalize. When we switch to Sarah Williams, an athletic runner, her resting heart rate baseline is set lower (65–80 BPM). The AI immediately adapts its risk boundaries specifically for her physiology."*

---

## 🧠 Explainable AI Risk Engine Logic

The risk engine (`ai/risk_engine.py`) operates deterministically across three mathematical layers:

### 1. Personalized Baseline Distance
$$Score_{base} = \sum w_v \cdot \Delta(V_i, Baseline_i)$$
Each vital $V_i$ (Heart Rate, SpO2, Temperature, Blood Pressure) is evaluated against $[Min_i, Max_i]$. Deviations outside the range accrue weighted penalty points scaled by the extent of breach.

### 2. Historical Trend Analysis
Evaluates the sliding 5-reading historical window:
- **Continuous Upward Progression**: Flags monotonic climbs in heart rate or body temperature ($\Delta HR \ge +10$ BPM over 4 consecutive intervals).
- **Desaturation Trajectory**: Flags continuous drops in SpO2 ($\Delta SpO2 \ge -2.0\%$ over 4 intervals).

### 3. Multi-Vital Correlation Matrix
Compounding risk factors are applied when multiple vitals deteriorate concurrently:
- **Distress Triad**: $HR > Max \land SpO2 < Min \land Temp > Max \implies +24\text{ Risk Points}$
- **Shock Trajectory**: $HR > Max \land Systolic < Min \implies +20\text{ Risk Points}$
- **Cross-Vital Factor**: $\text{Abnormal Count} \ge 2 \implies +(N \times 8)\text{ Risk Points}$

### Risk Bands
- **0 – 24**: `NORMAL` (Green) – Physiological equilibrium.
- **25 – 59**: `WARNING` (Amber) – Early compensatory drift.
- **60 – 100**: `CRITICAL` (Rose/Red) – Acute physiological compromise.

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the main responsive HTML5 dashboard |
| `GET` | `/api/patients` | Returns all patients with baseline thresholds and latest vitals |
| `GET` | `/api/patient/<id>` | Returns details and personal baseline for a specific patient |
| `GET` | `/api/vitals/<id>` | Returns chronological historical vitals for charting & audit |
| `GET` | `/api/alerts/<id>` | Returns historical warning and critical alerts |
| `POST` | `/api/vitals` | Ingests new telemetry reading, runs AI engine, logs alerts |
| `POST` | `/api/analyze` | On-demand risk assessment without persistent storage |
| `POST` | `/api/reset/<id>` | Resets patient history and restores baseline vitals |

---

## 🔮 Future Roadmap & Hardware Expansion

While VitalGuard AI is demonstrated here as a zero-cost simulated prototype, its modular API is engineered for rapid production hardware scaling:

1. **ESP32 IoT Gateway**: Wireless microcontroller streaming real sensor packets over MQTT/HTTP.
2. **MAX30102 Optical Sensor**: Real optical photoplethysmography (PPG) measuring authentic blood oxygen and pulse waveforms.
3. **High-Precision Skin Thermistor**: Digital I2C temperature monitoring (MAX30205).
4. **Bluetooth Low Energy (BLE) Wearable**: Low-power ambulatory wristbands for continuous post-operative monitoring.
5. **Hospital EHR / FHIR Integration**: Native integration with HL7 FHIR protocols for seamless clinical hospital integration.
6. **Mobile Nurse Alert App**: React Native / Flutter push notification client for floor nurses.

---

## ⚖️ License & Ethical Declarations
- **License**: MIT Open Source License.
- **Ethics & Privacy**: Built with privacy-by-design. Zero external analytics or third-party cloud data brokers are utilized.
