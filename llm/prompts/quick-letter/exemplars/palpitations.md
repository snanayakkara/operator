---
tags: ["palpitations", "arrhythmia", "symptoms", "investigation"]
dx: "Palpitations - likely benign ectopy, investigation planned"
audience: "GP"
tone: "reassuring"
---

# INPUT_TRANSCRIPT
Thank you for referring Ms. Chen regarding her palpitations. She's a 35-year-old woman experiencing episodes of rapid heartbeat lasting a few minutes, usually when stressed or tired. The episodes are not associated with chest pain or syncope. She has no significant medical history and takes no medications. Her family history is notable for maternal hypertension. On examination today, she was well with normal vital signs. Her ECG showed normal sinus rhythm with occasional premature ventricular contractions. Her thyroid function and FBC were normal. I've arranged a 24-hour Holter monitor to characterise the rhythm disturbance. Given the benign nature of her symptoms and normal examination, I've provided reassurance but advised her to return if symptoms worsen.

# TARGET_LETTER_JSON
{
  "sections": [
    {
      "title": "Symptom Assessment",
      "content": "35-year-old woman with episodes of palpitations lasting minutes, typically triggered by stress or fatigue. No associated chest pain or syncope."
    },
    {
      "title": "Clinical Findings",
      "content": "Well on examination with normal vital signs. Resting ECG shows sinus rhythm with occasional PVCs. No significant medical history."
    },
    {
      "title": "Investigations",
      "content": "Thyroid function and FBC normal. 24-hour Holter monitor arranged to characterise rhythm disturbance."
    },
    {
      "title": "Assessment and Reassurance",
      "content": "Clinical presentation consistent with benign ectopy. Patient reassured regarding likely benign nature of symptoms."
    }
  ],
  "impression": ["Palpitations likely secondary to PVCs", "No sinister features identified", "Further rhythm assessment indicated"],
  "plan": ["24-hour Holter monitoring", "Review results in 2 weeks", "Return if symptoms worsen", "Lifestyle modification advice"]
}