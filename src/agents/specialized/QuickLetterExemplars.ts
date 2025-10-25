/**
 * Quick Letter Exemplars - Bundled Content for Chrome Extension
 *
 * Contains full exemplar content extracted from markdown files for few-shot learning.
 * This approach bundles the content directly into the JavaScript to avoid Chrome extension
 * file access limitations.
 */

export interface ExemplarContent {
  file: string;
  tags: string[];
  dx: string;
  audience: string;
  tone: string;
  summary: string;
  inputTranscript: string;
  targetOutput: string;
}

export const QUICK_LETTER_EXEMPLARS: ExemplarContent[] = [
  {
    file: "new-referral.md",
    tags: ["new-referral", "consultation", "first-visit"],
    dx: "Chest pain assessment - ?coronary artery disease",
    audience: "GP",
    tone: "professional",
    summary: "New patient referral letter with initial assessment and plan",
    inputTranscript: `I had the pleasure of seeing Mrs. Johnson, a 65-year-old woman with a 3-month history of chest pain. The pain is typically retrosternal, occurs with exertion, and resolves with rest. She has a background of hypertension and diabetes. Her current medications include metformin 500mg twice daily and perindopril 5mg once daily. On examination today, she appeared comfortable at rest. Her blood pressure was 145/85 mmHg, pulse 78 regular. Cardiovascular examination revealed normal heart sounds with no murmurs. Her ECG showed normal sinus rhythm with no acute changes. Given her symptoms and risk factors, I have arranged stress testing and commenced aspirin 100mg daily. I plan to see her again in 4 weeks with the results.`,
    targetOutput: `**Clinical Assessment**
Mrs. Johnson presents with a 3-month history of exertional chest pain consistent with possible angina. Her cardiovascular risk factors include age, hypertension, and diabetes mellitus.

**Examination Findings**
Blood pressure 145/85 mmHg, pulse 78 regular. Cardiovascular examination normal with no murmurs or added sounds.

**Investigations**
Resting ECG shows normal sinus rhythm with no acute ischaemic changes. Stress testing has been arranged.

**Management Plan**
Commenced aspirin 100mg daily for cardiovascular protection. Awaiting stress test results for further risk stratification.

**Impression**: Possible stable angina pectoris. Cardiovascular risk factor modification required.
**Plan**: Stress testing, review in 4 weeks, optimise blood pressure control, continue diabetes management.`
  },
  {
    file: "post-angiogram.md",
    tags: ["post-angiogram", "procedure-followup", "CAD", "PCI"],
    dx: "Post-angiogram follow-up with PCI findings",
    audience: "cardiologist",
    tone: "technical",
    summary: "Post-angiogram results communication and management plan",
    inputTranscript: `Mr. Smith underwent diagnostic coronary angiography today. The procedure was performed via right radial approach under local anaesthetic. Coronary angiography revealed severe stenosis of the mid LAD with 80% narrowing and moderate disease in the RCA with 60% stenosis. The left circumflex was normal. Left ventricular function appeared preserved with good wall motion. We proceeded with PCI to the LAD using a drug-eluting stent measuring 3.0 x 18mm. Final result showed excellent stent deployment with TIMI 3 flow and no residual stenosis. The patient tolerated the procedure well with no complications. Post-procedure ECG showed no acute changes.`,
    targetOutput: `**Procedure Summary**
Diagnostic coronary angiography performed via right radial approach under local anaesthetic with subsequent percutaneous coronary intervention.

**Angiographic Findings**
- LAD: Severe stenosis (80%) in mid vessel
- RCA: Moderate stenosis (60%)
- LCx: Normal
- LV function: Preserved with good wall motion

**Intervention**
PCI to mid LAD with deployment of 3.0 x 18mm drug-eluting stent. Excellent final result with TIMI 3 flow and no residual stenosis.

**Outcome**
Procedure completed successfully without complications. Post-procedure ECG normal.

**Management Plan**
Dual antiplatelet therapy for 12 months, statin therapy, and cardiac rehabilitation referral.`
  },
  {
    file: "hf-followup.md",
    tags: ["HF", "heart-failure", "follow-up", "medication-review"],
    dx: "Heart failure follow-up with medication optimization",
    audience: "GP",
    tone: "collaborative",
    summary: "Heart failure management update with medication adjustments",
    inputTranscript: `Mrs. Brown returns for heart failure review. She has been feeling much better since our last visit with improved exercise tolerance. She can now walk to the shops without breathlessness. Her current medications include perindopril 10mg daily, metoprolol 50mg twice daily, and furosemide 40mg daily. Her weight has been stable at 68kg. Blood pressure today is 110/70 mmHg with heart rate 65 regular. Examination shows no peripheral oedema and clear lung fields. Recent blood tests show eGFR 45, potassium 4.2, and BNP 150. Echo last month showed improvement in ejection fraction from 35% to 45%. I plan to uptitrate her ACE inhibitor and consider adding spironolactone.`,
    targetOutput: `**Heart Failure Review**
Mrs. Brown demonstrates excellent clinical improvement since last visit with significantly improved exercise tolerance and functional capacity.

**Current Status**
- Symptomatically much improved - can walk to shops without dyspnoea
- Weight stable at 68kg
- BP 110/70 mmHg, HR 65 regular
- No peripheral oedema, clear lung fields

**Investigations**
Recent bloods: eGFR 45, K+ 4.2, BNP 150 (improved)
Echo: LVEF improved from 35% to 45%

**Current Medications**
- Perindopril 10mg daily
- Metoprolol 50mg BD
- Furosemide 40mg daily

**Management Plan**
Pleased with clinical improvement. Plan to optimise guideline-directed therapy with ACE inhibitor uptitration and consideration of mineralocorticoid receptor antagonist addition.`
  }
];

export const EXEMPLAR_REGISTRY = {
  exemplars: QUICK_LETTER_EXEMPLARS,
  tags: {
    "new-referral": "New patient referrals for cardiac assessment",
    "post-angiogram": "Post-angiogram procedure communications",
    "HF": "Heart failure management communications",
    "post-TAVI": "Post-TAVI procedure follow-up",
    "palpitations": "Palpitation and arrhythmia assessments",
    "syncope": "Syncope evaluation and risk stratification",
    "follow-up": "Follow-up visit communications",
    "procedure-followup": "Post-procedure follow-up letters",
    "consultation": "Consultation and assessment letters",
    "medication-review": "Medication management communications"
  }
};