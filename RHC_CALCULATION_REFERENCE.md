# Right Heart Catheterisation Calculation Reference

## Overview

The Operator RHC Agent automatically calculates comprehensive haemodynamic parameters when you dictate pressures and measurements. This document provides complete details on all calculations, normal ranges, and clinical interpretation.

**Key Features:**
- **Automatic Calculation**: All calculations happen automatically when you dictate RHC pressures
- **Three-Tier System**: Essential → High-Value → Advanced metrics
- **Color-Coded Display**: Green (normal), Amber (borderline), Red (abnormal)
- **13×13cm Card Export**: Key calculations included in presentation-ready PNG cards
- **Australian/ESC 2022 Guidelines**: All normal ranges follow current Australian and European guidelines

---

## Architecture

### Files
- **`src/services/RHCCalculationService.ts`** - All calculation functions (850+ lines)
- **`src/agents/specialized/RightHeartCathAgent.ts`** - Patient data extraction and calculation orchestration
- **`src/sidepanel/components/results/CalculatedHaemodynamicsDisplay.tsx`** - Three-tier display component
- **`src/sidepanel/components/results/RHCCardLayout.tsx`** - Card export with key calculations
- **`src/types/medical.types.ts`** - Type definitions for all calculations

### Data Flow
```
Dictation → RightHeartCathAgent.extractPatientData()
         → RightHeartCathAgent.calculateDerivedHaemodynamics()
         → RHCCalculationService functions
         → CalculatedHaemodynamics interface
         → Display in CalculatedHaemodynamicsDisplay + RHCCardLayout
```

---

## TIER 1: Essential Calculations

### 1.1 Patient Anthropometrics

#### Body Surface Area (BSA)
**Formula:** DuBois Formula
`BSA (m²) = 0.007184 × height^0.725 × weight^0.425`

**Normal Range:** 1.6–2.0 m²

**Required Data:**
- Height (cm)
- Weight (kg)

**Example:**
- Height: 175 cm, Weight: 80 kg
- BSA = 0.007184 × 175^0.725 × 80^0.425 = **1.95 m²**

---

#### Body Mass Index (BMI)
**Formula:** `BMI (kg/m²) = weight / (height in meters)²`

**Ranges:**
- Underweight: <18.5
- Normal: 18.5–24.9
- Overweight: 25.0–29.9
- Obese: ≥30.0

**Required Data:**
- Height (cm)
- Weight (kg)

---

#### Mean Arterial Pressure (MAP)
**Formula:** `MAP (mmHg) = (systolic + 2 × diastolic) / 3`

**Normal Range:** 70–100 mmHg

**Required Data:**
- Systolic BP (mmHg)
- Diastolic BP (mmHg)

**Example:**
- BP: 120/80 mmHg
- MAP = (120 + 2 × 80) / 3 = **93 mmHg**

---

### 1.2 Core Haemodynamics

#### Cardiac Index (CI)
**Formula:** `CI (L/min/m²) = Cardiac Output / BSA`

**Normal Range:** 2.5–4.0 L/min/m²

**Clinical Significance:**
- <2.0: Severe low output state (cardiogenic shock)
- 2.0–2.5: Mild-moderate low output
- 2.5–4.0: Normal
- >4.0: High output state (sepsis, thyrotoxicosis, severe anaemia)

**Required Data:**
- Cardiac Output (L/min) - from thermodilution or Fick
- BSA (m²)

**Example:**
- CO: 5.2 L/min, BSA: 1.95 m²
- CI = 5.2 / 1.95 = **2.67 L/min/m²** ✓ Normal

---

#### Stroke Volume (SV)
**Formula:** `SV (mL) = (Cardiac Output × 1000) / Heart Rate`

**Normal Range:** 60–100 mL

**Required Data:**
- Cardiac Output (L/min)
- Heart Rate (bpm)

**Example:**
- CO: 5.2 L/min, HR: 75 bpm
- SV = (5.2 × 1000) / 75 = **69 mL** ✓ Normal

---

### 1.3 Pulmonary Haemodynamics

#### Transpulmonary Gradient (TPG)
**Formula:** `TPG (mmHg) = PA mean - PCWP mean`

**Normal Range:** <12 mmHg

**Clinical Significance:**
- <12: Normal
- 12–25: Borderline (consider PVD vs passive congestion)
- >25: Pulmonary vascular disease

**Required Data:**
- PA mean pressure (mmHg)
- PCWP mean pressure (mmHg)

**Example:**
- PA mean: 18 mmHg, PCWP: 12 mmHg
- TPG = 18 - 12 = **6 mmHg** ✓ Normal

---

#### Diastolic Pressure Gradient (DPG)
**Formula:** `DPG (mmHg) = PA diastolic - PCWP mean`

**Normal Range:** <7 mmHg

**Clinical Significance (ESC 2022):**
- <5: Passive congestion (left heart failure)
- ≥5: Pulmonary vascular disease likely

**Required Data:**
- PA diastolic pressure (mmHg)
- PCWP mean pressure (mmHg)

**Example:**
- PA diastolic: 14 mmHg, PCWP: 12 mmHg
- DPG = 14 - 12 = **2 mmHg** → Suggests passive congestion

---

#### Pulmonary Vascular Resistance (PVR)
**Formula:** `PVR (Wood units) = (PA mean - PCWP mean) / Cardiac Output`

**Normal Range:** <3 Wood units

**To convert to dynes·s·cm⁻⁵:** Multiply by 80

**Clinical Significance:**
- <3 WU: Normal
- 3–5 WU: Mild elevation
- 5–8 WU: Moderate elevation
- >8 WU: Severe elevation

**Required Data:**
- PA mean pressure (mmHg)
- PCWP mean pressure (mmHg)
- Cardiac Output (L/min)

**Example:**
- PA mean: 18 mmHg, PCWP: 12 mmHg, CO: 5.2 L/min
- PVR = (18 - 12) / 5.2 = **1.15 Wood units** ✓ Normal

---

#### Pulmonary Vascular Resistance Index (PVRI)
**Formula:** `PVRI (Wood units·m²) = PVR × BSA`

**Normal Range:** <2.5 Wood units·m²

**Purpose:** Body size-adjusted PVR

**Required Data:**
- PVR (Wood units)
- BSA (m²)

---

### 1.4 Systemic Haemodynamics

#### Systemic Vascular Resistance (SVR)
**Formula:** `SVR (Wood units) = (MAP - RAP mean) / Cardiac Output`

**Normal Range:** 10–20 Wood units

**To convert to dynes·s·cm⁻⁵:** Multiply by 80

**Clinical Significance:**
- <10 WU: Low (sepsis, cirrhosis, thyrotoxicosis)
- 10–20 WU: Normal
- >20 WU: High (hypertension, vasoconstriction, cardiogenic shock)

**Required Data:**
- Mean Arterial Pressure (mmHg)
- RA mean pressure (mmHg)
- Cardiac Output (L/min)

**Example:**
- MAP: 93 mmHg, RAP: 6 mmHg, CO: 5.2 L/min
- SVR = (93 - 6) / 5.2 = **16.7 Wood units** ✓ Normal

---

#### Systemic Vascular Resistance Index (SVRI)
**Formula:** `SVRI (Wood units·m²) = SVR × BSA`

**Normal Range:** 20–30 Wood units·m²

**Purpose:** Body size-adjusted SVR

**Required Data:**
- SVR (Wood units)
- BSA (m²)

---

## TIER 2: High-Value Calculations

### 2.1 Fick Method

#### Fick Cardiac Output
**Formula:** `Fick CO (L/min) = VO₂ / ((SaO₂ - SvO₂) × Hb × 1.34 × 10)`

**Purpose:** Independent validation of thermodilution CO

**Parameters:**
- VO₂: Oxygen consumption (mL/min) - estimated from BSA if not measured
- SaO₂: Arterial oxygen saturation (%)
- SvO₂: Mixed venous oxygen saturation (%)
- Hb: Haemoglobin (g/L) - **Australian units**
- 1.34: Oxygen-carrying capacity of Hb (mL O₂/g Hb)

**Note:** Formula internally converts Hb from g/L to g/dL (÷10)

**VO₂ Estimation (LaFarge Formula):**
- Males: `VO₂ = 138.1 - (11.49 × ln(age)) + (0.378 × HR)`
- Females: `VO₂ = 138.1 - (17.04 × ln(age)) + (0.378 × HR)`

**Example:**
- Male, 60 years, HR 75 bpm
- VO₂ = 138.1 - (11.49 × ln(60)) + (0.378 × 75) = **195 mL/min**
- SaO₂ = 98%, SvO₂ = 70%, Hb = 140 g/L
- Fick CO = 195 / ((98 - 70) × 14 × 1.34 × 10) = **5.0 L/min**

---

#### Fick Cardiac Index
**Formula:** `Fick CI (L/min/m²) = Fick CO / BSA`

**Normal Range:** 2.5–4.0 L/min/m²

---

### 2.2 Advanced Cardiac Metrics (AHA 2021)

#### Cardiac Power Output (CPO)
**Formula:** `CPO (Watts) = (MAP × Cardiac Output) / 451`

**Normal Range:** ≥0.6 W

**Clinical Significance:**
- <0.6 W: Strong predictor of mortality in cardiogenic shock
- 0.6–1.0 W: Borderline
- >1.0 W: Normal

**Purpose:** Most powerful haemodynamic correlate of in-hospital mortality in shock

**Example:**
- MAP: 93 mmHg, CO: 5.2 L/min
- CPO = (93 × 5.2) / 451 = **1.07 W** ✓ Normal

---

#### Cardiac Power Index (CPI)
**Formula:** `CPI (W/m²) = CPO / BSA`

**Normal Range:** ≥0.5 W/m²

**Purpose:** Body size-adjusted CPO

---

#### Right Ventricular Stroke Work Index (RVSWI)
**Formula:** `RVSWI (mmHg·mL/m²) = (PA mean - RAP mean) × Stroke Volume Index × 0.0136`

**Normal Range:** 5–10 mmHg·mL/m²

**Purpose:** RV contractility index

**Example:**
- PA mean: 18 mmHg, RAP: 6 mmHg, SVI: 35 mL/m²
- RVSWI = (18 - 6) × 35 × 0.0136 = **5.7 g·m/m²** ✓ Normal

---

#### Left Ventricular Stroke Work Index (LVSWI)
**Formula:** `LVSWI (mmHg·mL/m²) = (MAP - PCWP mean) × Stroke Volume Index × 0.0136`

**Normal Range:** 50–62 mmHg·mL/m²

**Purpose:** LV contractility index

**Clinical Significance:**
- <35: Severe LV dysfunction
- 35–50: Moderate dysfunction
- 50–62: Normal
- >62: Hyperdynamic state

---

#### Pulmonary Artery Pulsatility Index (PAPi)
**Formula:** `PAPi = (PA systolic - PA diastolic) / RAP mean`

**Normal Range:** >1.0

**Clinical Significance:**
- <1.0: Strong predictor of RV failure post-LVAD, post-MI
- 1.0–2.0: Intermediate risk
- >2.0: Low risk

**Purpose:** Predictor of RV failure in LVAD candidates, acute MI with RV involvement

**Example:**
- PA: 30/14 mmHg, RAP: 6 mmHg
- PAPi = (30 - 14) / 6 = **2.67** ✓ Low RV failure risk

---

## TIER 3: Advanced Calculations

### 3.1 Oxygen Transport

#### Oxygen Delivery (DO₂)
**Formula:** `DO₂ (mL/min) = CO × ((Hb × 1.34 × SaO₂) + (PaO₂ × 0.003)) × 10`

**Normal Range:** 950–1150 mL/min

**Components:**
- Haemoglobin-bound O₂: `Hb × 1.34 × SaO₂ × 10`
- Dissolved O₂: `PaO₂ × 0.003 × 10`

**Clinical Significance:**
- <500 mL/min: Critical (tissue hypoxia likely)
- 500–950 mL/min: Low
- 950–1150 mL/min: Normal
- >1150 mL/min: High (sepsis, high output states)

---

#### Oxygen Extraction Ratio (O₂ER)
**Formula:** `O₂ER (%) = ((SaO₂ - SvO₂) / SaO₂) × 100`

**Normal Range:** 22–30%

**Clinical Significance:**
- <22%: Low extraction (high CO state, shunt, impaired extraction)
- 22–30%: Normal
- >30%: High extraction (low CO, anaemia, increased O₂ demand)

**Example:**
- SaO₂ = 98%, SvO₂ = 70%
- O₂ER = ((98 - 70) / 98) × 100 = **28.6%** ✓ Normal

---

### 3.2 Ventricular-Arterial Coupling

#### Pulmonary Arterial Compliance (PAC)
**Formula:** `PAC (mL/mmHg) = Stroke Volume / (PA systolic - PA diastolic)`

**Normal Range:** 1.5–3.0 mL/mmHg

**Clinical Significance:**
- <1.5: Stiff pulmonary vasculature (PH, age-related stiffening)
- 1.5–3.0: Normal
- >3.0: Compliant vessels

**Purpose:** Prognostic marker in pulmonary hypertension

**Example:**
- SV: 69 mL, PA: 30/14 mmHg
- PAC = 69 / (30 - 14) = **4.3 mL/mmHg** (high compliance)

---

#### RC Time Constant
**Formula:** `RC Time (s) = PAC × PVR`

**Normal Range:** 0.3–0.8 s

**Purpose:** Right ventricular afterload assessment in pulmonary hypertension

**Clinical Significance:**
- <0.5 s: Favorable RV loading conditions
- 0.5–1.0 s: Intermediate
- >1.0 s: Adverse RV loading (poor prognosis)

---

#### Left Ventricular End-Systolic Elastance (Ees)
**Formula:** `Ees (mmHg/mL) = LVESP / LVESV`

**Purpose:** LV contractility independent of loading conditions

**Required Data:**
- LVESP: LV end-systolic pressure (mmHg) - from simultaneous echo/cath
- LVESV: LV end-systolic volume (mL) - from echo

**Normal Range:** 2.0–4.0 mmHg/mL

**Note:** Requires simultaneous echocardiography; rarely calculated in routine RHC

---

#### Effective Arterial Elastance (Ea)
**Formula:** `Ea (mmHg/mL) = LVESP / Stroke Volume`

**Purpose:** LV afterload

**Normal Range:** 1.5–2.5 mmHg/mL

**Ventricular-Arterial Coupling Ratio:**
`Ees/Ea ratio = LV elastance / Arterial elastance`
- Normal: 1.5–2.0 (optimal mechanical efficiency)
- <1.0: Poor coupling (LV cannot overcome afterload)

---

## Clinical Assessment

### Pulmonary Hypertension Classification (ESC 2022)

**Haemodynamic Definition:**
- Pre-capillary PH: PA mean >20 mmHg, PCWP ≤15 mmHg, PVR ≥3 WU
- Isolated post-capillary PH: PA mean >20 mmHg, PCWP >15 mmHg, PVR <3 WU
- Combined pre- and post-capillary PH: PA mean >20 mmHg, PCWP >15 mmHg, PVR ≥3 WU

**Types:**
1. **Pulmonary Arterial Hypertension (PAH)** - Group 1
2. **PH due to left heart disease** - Group 2 (most common)
3. **PH due to lung disease/hypoxia** - Group 3
4. **PH due to pulmonary artery obstruction (CTEPH)** - Group 4
5. **PH with unclear/multifactorial mechanisms** - Group 5

**Severity Grading:**
- Mild: PVR 3–5 WU
- Moderate: PVR 5–8 WU
- Severe: PVR >8 WU

---

### Risk Stratification

**High-Risk Features (Poor Prognosis):**
- CI <2.0 L/min/m²
- RAP >15 mmHg
- SvO₂ <60%
- CPO <0.6 W
- PAPi <1.0
- RVSWI <4 g·m/m²

**Low-Risk Features (Good Prognosis):**
- CI >2.5 L/min/m²
- RAP <8 mmHg
- SvO₂ >65%
- CPO >1.0 W
- PAPi >2.0
- RVSWI >8 g·m/m²

---

## Display Features

### Component Hierarchy

#### 1. CalculatedHaemodynamicsDisplay (Main UI)
**Location:** Collapsible "Calculated Haemodynamics" section in RHC results

**Structure:**
```
┌─ Clinical Assessment Banner (if high-risk features present)
│
├─ TIER 1: Essential Calculations (always expanded)
│  ├─ Patient Anthropometrics (BSA, BMI)
│  ├─ Core Haemodynamics (MAP, SV, CI)
│  ├─ Pulmonary (TPG, DPG, PVR, PVRI)
│  └─ Systemic (SVR, SVRI)
│
├─ TIER 2: High-Value Calculations (collapsible)
│  ├─ Fick Method (Fick CO, Fick CI)
│  └─ Advanced Metrics (CPO, CPI, RVSWI, LVSWI, PAPi)
│
└─ TIER 3: Advanced Calculations (collapsible)
   ├─ Oxygen Transport (DO₂, O₂ER)
   └─ Ventricular-Arterial Coupling (PAC, RC Time, Ees, Ea)
```

**Color Coding:**
- 🟢 Green: Normal range
- 🟡 Amber: Borderline
- 🔴 Red: Abnormal
- ⚠️ Alert icons for critical values

---

#### 2. RHCCardLayout (13×13cm PNG Export)
**Calculated Values Section:**
```
┌─ Calculated Haemodynamics
│
├─ Primary Row (always shown if available):
│  ├─ CI (L/min/m²)
│  ├─ PVR (Wood units)
│  ├─ SVR (Wood units)
│  └─ TPG (mmHg)
│
└─ Advanced Row (shown if Tier 2 calculations exist):
   ├─ CPO (Watts)
   └─ PAPi (unitless)
```

**Card Export Features:**
- 300 DPI resolution (1535×1535 px)
- Color-coded values (green=normal, red=abnormal)
- Includes normal ranges
- Professional footer with branding

---

## Usage Examples

### Example 1: Normal RHC
**Dictated Data:**
- Patient: 65M, 175 cm, 80 kg
- BP: 120/80 mmHg, HR: 75 bpm
- RA: 6 mmHg (mean)
- RV: 28/6 mmHg
- PA: 28/12 mmHg (mean 18)
- PCWP: 10 mmHg (mean)
- CO (thermodilution): 5.2 L/min

**Automatic Calculations:**
- BSA: 1.95 m² ✓
- BMI: 26.1 kg/m² (overweight)
- MAP: 93 mmHg ✓
- CI: 2.67 L/min/m² ✓ Normal
- SV: 69 mL ✓
- TPG: 8 mmHg ✓ Normal
- DPG: 2 mmHg (suggests passive congestion if symptomatic)
- PVR: 1.54 Wood units ✓ Normal
- SVR: 16.7 Wood units ✓ Normal
- CPO: 1.07 W ✓ Normal

**Clinical Assessment:** Normal haemodynamics. No pulmonary hypertension.

---

### Example 2: Pulmonary Arterial Hypertension
**Dictated Data:**
- Patient: 45F, 165 cm, 60 kg
- BP: 110/70 mmHg, HR: 85 bpm
- RA: 10 mmHg
- RV: 75/10 mmHg
- PA: 75/35 mmHg (mean 50)
- PCWP: 8 mmHg
- CO: 3.8 L/min
- SaO₂: 94%, SvO₂: 58%, Hb: 130 g/L

**Automatic Calculations:**
- BSA: 1.66 m²
- CI: 2.29 L/min/m² (borderline low)
- TPG: 42 mmHg ⚠️ Severely elevated
- DPG: 27 mmHg ⚠️ Pulmonary vascular disease
- PVR: 11.1 Wood units ⚠️ Severe PH
- PVRI: 18.4 WU·m² ⚠️ Severe
- PAPi: 4.0 ✓ (low RV failure risk despite high pressures)
- CPO: 0.86 W ✓
- O₂ER: 38% ⚠️ High extraction (compensating for low CO)

**Clinical Assessment:**
- **Classification:** Pre-capillary pulmonary hypertension (Group 1 PAH likely)
- **Severity:** Severe (PVR >8 WU)
- **Risk Stratification:** Intermediate (low CI, high SvO₂ extraction, but preserved CPO and PAPi)

---

### Example 3: Cardiogenic Shock
**Dictated Data:**
- Patient: 70M, 180 cm, 90 kg (post-MI)
- BP: 85/60 mmHg, HR: 110 bpm
- RA: 18 mmHg
- RV: 45/18 mmHg
- PA: 45/28 mmHg (mean 35)
- PCWP: 25 mmHg
- CO: 3.2 L/min
- SaO₂: 96%, SvO₂: 52%

**Automatic Calculations:**
- BSA: 2.13 m²
- CI: 1.50 L/min/m² ⚠️ Severe low output
- MAP: 68 mmHg (borderline)
- TPG: 10 mmHg ✓
- PVR: 3.1 Wood units (mild elevation from passive congestion)
- SVR: 15.6 Wood units ✓ (surprisingly normal - ? vasopressor use)
- CPO: 0.48 W ⚠️ Critical (strong mortality predictor)
- PAPi: 0.94 ⚠️ High RV failure risk
- RVSWI: 3.5 g·m/m² ⚠️ Severe RV dysfunction
- O₂ER: 46% ⚠️ Maximal extraction

**Clinical Assessment:**
- **Classification:** Cardiogenic shock with RV involvement
- **Risk Stratification:** HIGH RISK
  - CI <2.0
  - RAP >15
  - CPO <0.6 (strongest mortality predictor)
  - PAPi <1.0 (RV failure)
  - RVSWI low (RV dysfunction)
  - O₂ER >40% (critical oxygen extraction)
- **Recommendations:** Urgent mechanical support consideration (IABP, Impella, VA-ECMO)

---

## Dictation Tips for Optimal Calculation

### Always Include:
1. **Patient Demographics**: Age, sex, height, weight
2. **Vital Signs**: BP, HR
3. **Laboratory**: Haemoglobin, SaO₂, SvO₂ (if available)
4. **RHC Pressures**:
   - RA: mean (and A/V waves if present)
   - RV: systolic/diastolic
   - PA: systolic/diastolic/mean
   - PCWP: mean
5. **Cardiac Output**: Thermodilution CO/CI

### Optional (for Advanced Calculations):
- PaO₂ (for oxygen delivery calculation)
- Mixed venous gases (for Fick CO)
- Echo data (LVESV, LVESP for elastance)

### Example Dictation:
```
"65-year-old male, 175 centimeters, 80 kilograms, blood pressure 120/80, heart rate 75.

Right atrial pressure mean 6 millimeters of mercury.
Right ventricular pressure 28 over 6.
Pulmonary artery pressure 28 over 12, mean 18.
Pulmonary capillary wedge pressure mean 10.

Thermodilution cardiac output 5.2 liters per minute, cardiac index 2.7.

Arterial oxygen saturation 98%, mixed venous saturation 70%, haemoglobin 140 grams per litre."
```

**Result:** All Tier 1 + Tier 2 calculations will be automatically computed and displayed.

---

## References

1. **ESC/ERS Guidelines 2022**: Updated pulmonary hypertension guidelines
2. **AHA Scientific Statement 2021**: Advanced haemodynamic assessment in heart failure and cardiogenic shock
3. **DuBois Formula (1916)**: BSA calculation
4. **LaFarge Formula (1970)**: VO₂ estimation
5. **Naidu et al. (2015)**: Cardiac power output in cardiogenic shock
6. **Kochav et al. (2018)**: Pulmonary artery pulsatility index
7. **Sunagawa et al. (1983)**: Ventricular-arterial coupling

---

## Version History

**Version 1.0** (October 2025)
- Initial implementation of all three tiers
- 25+ calculations across anthropometrics, haemodynamics, oxygen transport, and coupling
- Color-coded display with clinical assessment
- Integration with 13×13cm card export
- Automatic calculation from dictated pressures

---

**For questions or feature requests, see the main CLAUDE.md documentation.**
