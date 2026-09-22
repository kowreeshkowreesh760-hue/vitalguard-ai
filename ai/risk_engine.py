"""
VitalGuard AI - Explainable AI Risk & Telemetry Engine
Prototype for 24-Hour Hackathon - Simulates zero-cost explainable clinical risk analysis.
NOTE: This is an educational simulation prototype, NOT a medical diagnostic tool.
"""

from typing import Dict, List, Any, Optional

class VitalRiskEngine:
    """
    Evaluates patient vital telemetry using:
    1. Patient-specific personal baseline comparison
    2. Historical trend analysis (trajectory & volatility)
    3. Multi-vital correlation (dangerous concurrent deviations)
    """

    @staticmethod
    def calculate_risk(
        current_vitals: Dict[str, float],
        baseline: Dict[str, float],
        recent_history: Optional[List[Dict[str, float]]] = None
    ) -> Dict[str, Any]:
        """
        Computes an explainable risk score (0-100) and structured clinical rationale.
        Score categories:
          0 - 24: NORMAL (Green)
         25 - 59: WARNING (Yellow/Amber)
         60 - 100: CRITICAL (Red)
        """
        hr = float(current_vitals.get('heart_rate', 75))
        spo2 = float(current_vitals.get('spo2', 98))
        temp = float(current_vitals.get('temperature', 36.8))
        sys_bp = float(current_vitals.get('systolic', 120))
        dia_bp = float(current_vitals.get('diastolic', 80))

        # Patient personal baseline bands
        hr_min = float(baseline.get('hr_min', 70))
        hr_max = float(baseline.get('hr_max', 85))
        spo2_min = float(baseline.get('spo2_min', 96))
        spo2_max = float(baseline.get('spo2_max', 99))
        temp_min = float(baseline.get('temp_min', 36.5))
        temp_max = float(baseline.get('temp_max', 37.2))
        sys_min = float(baseline.get('sys_min', 110))
        sys_max = float(baseline.get('sys_max', 130))
        dia_min = float(baseline.get('dia_min', 70))
        dia_max = float(baseline.get('dia_max', 85))

        base_score = 5.0  # Ambient healthy baseline noise
        reasons = []
        vital_statuses = {}
        abnormal_count = 0

        # ==========================================
        # 1. HEART RATE EVALUATION
        # ==========================================
        hr_status = "Normal"
        hr_dev_text = "Within baseline"
        if hr > hr_max:
            delta = hr - hr_max
            if delta > 25:
                base_score += 28
                hr_status = "Critical"
                hr_dev_text = f"+{delta:.0f} BPM (Severe Tachycardia)"
                reasons.append(f"Heart rate significantly above patient baseline ({hr:.0f} BPM vs baseline max {hr_max:.0f} BPM)")
                abnormal_count += 1
            elif delta > 10:
                base_score += 16
                hr_status = "Warning"
                hr_dev_text = f"+{delta:.0f} BPM (Elevated)"
                reasons.append(f"Heart rate is moderately elevated above baseline ({hr:.0f} BPM vs {hr_max:.0f} BPM)")
                abnormal_count += 1
            else:
                base_score += 8
                hr_status = "Borderline"
                hr_dev_text = f"+{delta:.0f} BPM (Mild drift)"
        elif hr < hr_min:
            delta = hr_min - hr
            if delta > 15:
                base_score += 24
                hr_status = "Critical"
                hr_dev_text = f"-{delta:.0f} BPM (Severe Bradycardia)"
                reasons.append(f"Heart rate critically depressed below baseline ({hr:.0f} BPM vs baseline min {hr_min:.0f} BPM)")
                abnormal_count += 1
            else:
                base_score += 12
                hr_status = "Warning"
                hr_dev_text = f"-{delta:.0f} BPM (Low)"
                reasons.append(f"Heart rate slightly below baseline ({hr:.0f} BPM vs {hr_min:.0f} BPM)")
                abnormal_count += 1

        vital_statuses['heart_rate'] = {"status": hr_status, "deviation": hr_dev_text, "value": hr}

        # ==========================================
        # 2. SPO2 (OXYGEN SATURATION) EVALUATION
        # ==========================================
        spo2_status = "Normal"
        spo2_dev_text = "Optimal"
        if spo2 < 90:
            base_score += 35
            spo2_status = "Critical"
            spo2_dev_text = f"{spo2:.1f}% (Severe Hypoxemia)"
            reasons.append(f"SpO2 critically below safe threshold ({spo2:.1f}% vs baseline min {spo2_min:.1f}%)")
            abnormal_count += 1
        elif spo2 < spo2_min:
            delta = spo2_min - spo2
            if delta >= 3:
                base_score += 22
                spo2_status = "Critical"
                spo2_dev_text = f"-{delta:.1f}% (Moderate Hypoxia)"
                reasons.append(f"SpO2 significantly depressed below patient baseline ({spo2:.1f}% vs {spo2_min:.1f}%)")
                abnormal_count += 1
            else:
                base_score += 12
                spo2_status = "Warning"
                spo2_dev_text = f"-{delta:.1f}% (Sub-optimal)"
                reasons.append(f"SpO2 is slightly below patient baseline ({spo2:.1f}% vs {spo2_min:.1f}%)")
                abnormal_count += 1

        vital_statuses['spo2'] = {"status": spo2_status, "deviation": spo2_dev_text, "value": spo2}

        # ==========================================
        # 3. BODY TEMPERATURE EVALUATION
        # ==========================================
        temp_status = "Normal"
        temp_dev_text = "Euthermic"
        if temp > temp_max:
            delta = temp - temp_max
            if delta >= 1.5 or temp >= 38.5:
                base_score += 25
                temp_status = "Critical"
                temp_dev_text = f"+{delta:.1f}°C (High Hyperthermia)"
                reasons.append(f"Temperature is elevated into high fever zone ({temp:.1f}°C vs baseline max {temp_max:.1f}°C)")
                abnormal_count += 1
            elif delta >= 0.5:
                base_score += 15
                temp_status = "Warning"
                temp_dev_text = f"+{delta:.1f}°C (Pyrexia / Low-grade Fever)"
                reasons.append(f"Temperature elevated above baseline ({temp:.1f}°C vs {temp_max:.1f}°C)")
                abnormal_count += 1
            else:
                base_score += 6
                temp_status = "Borderline"
                temp_dev_text = f"+{delta:.1f}°C (Mild elevation)"
        elif temp < temp_min:
            delta = temp_min - temp
            if delta >= 1.0 or temp <= 35.5:
                base_score += 20
                temp_status = "Critical"
                temp_dev_text = f"-{delta:.1f}°C (Hypothermia)"
                reasons.append(f"Temperature abnormally low ({temp:.1f}°C vs baseline min {temp_min:.1f}°C)")
                abnormal_count += 1
            else:
                base_score += 10
                temp_status = "Warning"
                temp_dev_text = f"-{delta:.1f}°C (Sub-baseline)"
                reasons.append(f"Temperature slightly below baseline ({temp:.1f}°C vs {temp_min:.1f}°C)")
                abnormal_count += 1

        vital_statuses['temperature'] = {"status": temp_status, "deviation": temp_dev_text, "value": temp}

        # ==========================================
        # 4. BLOOD PRESSURE EVALUATION
        # ==========================================
        bp_status = "Normal"
        bp_dev_text = "Normotensive"
        bp_abnormal = False
        if sys_bp > sys_max or dia_bp > dia_max:
            sys_diff = max(0, sys_bp - sys_max)
            dia_diff = max(0, dia_bp - dia_max)
            if sys_bp >= 160 or dia_bp >= 100:
                base_score += 24
                bp_status = "Critical"
                bp_dev_text = f"{sys_bp:.0f}/{dia_bp:.0f} (Stage 2 Hypertension)"
                reasons.append(f"Blood pressure severely elevated ({sys_bp:.0f}/{dia_bp:.0f} mmHg vs baseline {sys_min:.0f}-{sys_max:.0f}/{dia_min:.0f}-{dia_max:.0f})")
                bp_abnormal = True
            elif sys_diff > 15 or dia_diff > 10:
                base_score += 14
                bp_status = "Warning"
                bp_dev_text = f"+{sys_diff:.0f}/+{dia_diff:.0f} mmHg (Hypertension Stage 1)"
                reasons.append(f"Blood pressure elevated above baseline ({sys_bp:.0f}/{dia_bp:.0f} mmHg)")
                bp_abnormal = True
            else:
                base_score += 6
                bp_status = "Borderline"
                bp_dev_text = f"Mild elevation ({sys_bp:.0f}/{dia_bp:.0f})"
        elif sys_bp < sys_min or dia_bp < dia_min:
            sys_drop = max(0, sys_min - sys_bp)
            dia_drop = max(0, dia_min - dia_bp)
            if sys_bp <= 90 or dia_bp <= 60:
                base_score += 26
                bp_status = "Critical"
                bp_dev_text = f"{sys_bp:.0f}/{dia_bp:.0f} (Hypotension / Shock Risk)"
                reasons.append(f"Blood pressure critically hypotensive ({sys_bp:.0f}/{dia_bp:.0f} mmHg vs min {sys_min:.0f}/{dia_min:.0f})")
                bp_abnormal = True
            else:
                base_score += 12
                bp_status = "Warning"
                bp_dev_text = f"-{sys_drop:.0f}/-{dia_drop:.0f} mmHg (Low BP)"
                reasons.append(f"Blood pressure running below baseline ({sys_bp:.0f}/{dia_bp:.0f} mmHg)")
                bp_abnormal = True

        if bp_abnormal:
            abnormal_count += 1

        vital_statuses['blood_pressure'] = {"status": bp_status, "deviation": bp_dev_text, "systolic": sys_bp, "diastolic": dia_bp}

        # ==========================================
        # 5. MULTI-VITAL CORRELATION
        # ==========================================
        correlation_detected = False
        correlation_summary = ""

        # Specific pathological combinations
        if hr > hr_max and spo2 < spo2_min and temp > temp_max:
            correlation_detected = True
            base_score += 24
            correlation_summary = "Simultaneous tachycardia, hypoxemia, and hyperthermia detected (Acute Physiological Distress Triad)."
            reasons.append(f"🔎 Multi-Vital Correlation: {correlation_summary}")
        elif hr > hr_max and sys_bp < sys_min:
            correlation_detected = True
            base_score += 20
            correlation_summary = "Compensatory tachycardia coupled with dropping blood pressure (Hypotensive / Shock Trajectory)."
            reasons.append(f"🔎 Multi-Vital Correlation: {correlation_summary}")
        elif hr > hr_max and spo2 < spo2_min:
            correlation_detected = True
            base_score += 15
            correlation_summary = "Elevated heart rate with declining oxygen saturation (Respiratory Compensation)."
            reasons.append(f"🔎 Multi-Vital Correlation: {correlation_summary}")
        elif abnormal_count >= 2:
            correlation_detected = True
            base_score += (abnormal_count * 8)
            correlation_summary = f"{abnormal_count} vital parameters are concurrently deviating from patient baseline."
            reasons.append(f"🔎 Multi-Vital Correlation: {correlation_summary}")

        # ==========================================
        # 6. HISTORICAL TREND ANALYSIS
        # ==========================================
        trend_notes = []
        if recent_history and len(recent_history) >= 3:
            hr_series = [float(h.get('heart_rate', hr)) for h in recent_history[-5:]] + [hr]
            spo2_series = [float(h.get('spo2', spo2)) for h in recent_history[-5:]] + [spo2]
            temp_series = [float(h.get('temperature', temp)) for h in recent_history[-5:]] + [temp]

            # Check continuous upward HR trend
            if len(hr_series) >= 4 and all(hr_series[i] <= hr_series[i+1] for i in range(len(hr_series)-1)) and (hr_series[-1] - hr_series[0] >= 10):
                base_score += 12
                note = f"Heart rate has shown a continuous upward trend over recent readings ({hr_series[0]:.0f} → {hr_series[-1]:.0f} BPM)."
                trend_notes.append(note)
                reasons.append(f"📈 Trend Alert: {note}")

            # Check continuous downward SpO2 trend
            if len(spo2_series) >= 4 and all(spo2_series[i] >= spo2_series[i+1] for i in range(len(spo2_series)-1)) and (spo2_series[0] - spo2_series[-1] >= 2.0):
                base_score += 15
                note = f"SpO2 has shown a continuous downward trajectory ({spo2_series[0]:.1f}% → {spo2_series[-1]:.1f}%)."
                trend_notes.append(note)
                reasons.append(f"📉 Trend Alert: {note}")

            # Check rapid temperature spike
            if len(temp_series) >= 3 and (temp_series[-1] - temp_series[0] >= 0.8):
                base_score += 10
                note = f"Rapid temperature rise detected ({temp_series[0]:.1f}°C → {temp_series[-1]:.1f}°C)."
                trend_notes.append(note)
                reasons.append(f"📈 Trend Alert: {note}")

        # ==========================================
        # 7. FINAL SCORE NORMALIZATION & CLASSIFICATION
        # ==========================================
        # Clamp strictly between 0 and 100
        final_score = int(min(100, max(0, round(base_score))))

        # Determine clinical status band
        if final_score >= 60:
            status = "CRITICAL"
        elif final_score >= 25:
            status = "WARNING"
        else:
            status = "NORMAL"

        if not reasons:
            reasons.append("All vital signs are steady within the patient's personal baseline range.")
            reasons.append("No adverse physiological trend or cross-vital correlation detected.")

        return {
            "risk_score": final_score,
            "status": status,
            "reasons": reasons,
            "vital_statuses": vital_statuses,
            "correlation_detected": correlation_detected,
            "correlation_summary": correlation_summary,
            "trend_notes": trend_notes,
            "abnormal_count": abnormal_count,
            "baseline_compared": {
                "hr_range": f"{hr_min:.0f}–{hr_max:.0f} BPM",
                "spo2_range": f"{spo2_min:.0f}–{spo2_max:.0f}%",
                "temp_range": f"{temp_min:.1f}–{temp_max:.1f}°C",
                "bp_range": f"{sys_min:.0f}–{sys_max:.0f}/{dia_min:.0f}–{dia_max:.0f} mmHg"
            }
        }
