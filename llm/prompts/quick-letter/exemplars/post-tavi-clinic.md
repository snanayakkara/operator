---
tags: ["post-TAVI", "valve", "procedure-followup", "clinic-visit"]
dx: "Severe aortic stenosis - post TAVI procedure"
audience: "specialist"
tone: "clinical"
---

# INPUT_TRANSCRIPT
Mrs. Williams returns for her 3-month post-TAVI review. She underwent TAVI with a 26mm Sapien 3 valve 3 months ago for severe aortic stenosis. The procedure was uncomplicated with transfemoral access. Today she reports marked improvement in her exercise tolerance and is no longer experiencing breathlessness. On examination, her pulse is 72 regular, blood pressure 130/70. There is a soft systolic murmur consistent with normal valve function. Her recent echo shows excellent valve function with mean gradient of 8mmHg and no paravalvular leak. EF has improved to 55%. She remains on aspirin and I've stopped the clopidogrel as planned. Her heart failure medications can be weaned given the excellent functional improvement.

# TARGET_LETTER_JSON
{
  "sections": [
    {
      "title": "Procedure Background",
      "content": "TAVI performed 3 months ago using 26mm Sapien 3 valve via transfemoral approach for severe aortic stenosis. Procedure uncomplicated."
    },
    {
      "title": "Clinical Assessment",
      "content": "Marked symptomatic improvement with resolution of exertional dyspnoea. Exercise tolerance significantly improved."
    },
    {
      "title": "Examination Findings",
      "content": "Pulse 72 regular, BP 130/70 mmHg. Soft systolic murmur consistent with normal valve function."
    },
    {
      "title": "Echocardiographic Results",
      "content": "Excellent valve function with mean gradient 8mmHg. No paravalvular leak detected. Left ventricular function improved to EF 55%."
    },
    {
      "title": "Medication Management",
      "content": "Clopidogrel discontinued as planned. Aspirin continued. Heart failure medications can be weaned given excellent functional recovery."
    }
  ],
  "impression": ["Excellent post-TAVI outcome", "Successful valve function", "Marked clinical improvement", "LV function recovery"],
  "plan": ["Continue aspirin", "Wean heart failure medications", "Annual cardiology follow-up", "Encourage increased activity"]
}