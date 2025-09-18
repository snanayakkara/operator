---
tags: ["HF", "heart-failure", "follow-up", "medication-review"]
dx: "Heart failure with reduced ejection fraction - medication optimisation"
audience: "GP"
tone: "collaborative"
---

# INPUT_TRANSCRIPT
Thank you for the ongoing care of Mr. Brown with heart failure. His symptoms have improved since starting the ACE inhibitor, though he still experiences some breathlessness on exertion. His most recent echo shows an ejection fraction of 35%. I've increased his perindopril to 8mg daily and added bisoprolol 2.5mg daily. His renal function remains stable with creatinine at 110. We've also increased his frusemide to 40mg daily for better fluid balance. He's now taking spironolactone 25mg daily as well. I'd like you to monitor his potassium and creatinine in 2 weeks, and I'll see him again in 6 weeks to assess response to the medication changes.

# TARGET_LETTER_JSON
{
  "sections": [
    {
      "title": "Clinical Update",
      "content": "Symptom improvement noted since commencing ACE inhibitor therapy. Some residual exertional dyspnoea persists. Recent echocardiogram shows LVEF 35%."
    },
    {
      "title": "Medication Adjustments",
      "content": "Perindopril increased to 8mg daily. Beta-blocker therapy initiated with bisoprolol 2.5mg daily. Frusemide increased to 40mg daily for optimised diuresis. Spironolactone 25mg daily added for additional prognostic benefit."
    },
    {
      "title": "Monitoring Requirements",
      "content": "Renal function stable with creatinine 110μmol/L. Potassium and renal function monitoring required in 2 weeks following medication changes."
    },
    {
      "title": "Follow-up Plan",
      "content": "Cardiology review in 6 weeks to assess response to optimised medical therapy."
    }
  ],
  "impression": ["Heart failure with reduced EF", "Good response to initial therapy", "Medication optimisation in progress"],
  "plan": ["Continue up-titrated medications", "Monitor U&E in 2 weeks", "Cardiology review in 6 weeks", "Consider further optimisation based on tolerance"]
}