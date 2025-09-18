---
tags: ["syncope", "collapse", "investigation", "risk-stratification"]
dx: "Syncope - further investigation required"
audience: "emergency-physician"
tone: "urgent"
---

# INPUT_TRANSCRIPT
Mr. Davis, a 72-year-old man, presented following a syncopal episode this morning while gardening. He had no warning symptoms and was unconscious for approximately 30 seconds according to his wife. He recovered quickly with no confusion. His medical history includes hypertension and he takes amlodipine 5mg daily. On examination, his pulse was 45 irregular, blood pressure 110/65. His ECG showed atrial fibrillation with a slow ventricular response and some pauses up to 3 seconds. Given the bradycardia and pauses, I suspect his syncope is likely cardiogenic. I've admitted him for cardiac monitoring and pacing assessment. His blood tests including troponin were normal. He will need urgent cardiology review for consideration of permanent pacemaker insertion.

# TARGET_LETTER_JSON
{
  "sections": [
    {
      "title": "Presentation",
      "content": "72-year-old gentleman with witnessed syncopal episode lasting 30 seconds. No prodromal symptoms, rapid recovery without confusion."
    },
    {
      "title": "Clinical Assessment",
      "content": "Pulse 45 irregular, BP 110/65 mmHg. ECG reveals atrial fibrillation with slow ventricular response and pauses up to 3 seconds."
    },
    {
      "title": "Risk Stratification",
      "content": "High-risk syncope with likely cardiogenic aetiology secondary to bradycardia and conduction abnormalities."
    },
    {
      "title": "Immediate Management",
      "content": "Admitted for continuous cardiac monitoring. Blood tests including troponin normal. Urgent cardiology consultation requested."
    }
  ],
  "impression": ["Cardiogenic syncope", "Atrial fibrillation with slow ventricular response", "Significant conduction pauses", "High-risk presentation"],
  "plan": ["Cardiac monitoring", "Urgent cardiology review", "Consider permanent pacemaker", "Anticoagulation assessment for AF"]
}