---
tags: ["new-referral", "consultation", "first-visit"]
dx: "Chest pain assessment - ?coronary artery disease"
audience: "GP"
tone: "professional"
---

# INPUT_TRANSCRIPT
Thank you for referring Mrs. Johnson, a 65-year-old woman with a 3-month history of chest pain. The pain is typically retrosternal, occurs with exertion, and resolves with rest. She has a background of hypertension and diabetes. Her current medications include metformin 500mg twice daily and perindopril 5mg once daily. On examination today, she appeared comfortable at rest. Her blood pressure was 145/85 mmHg, pulse 78 regular. Cardiovascular examination revealed normal heart sounds with no murmurs. Her ECG showed normal sinus rhythm with no acute changes. Given her symptoms and risk factors, I have arranged stress testing and commenced aspirin 100mg daily. I plan to see her again in 4 weeks with the results.

# TARGET_LETTER_JSON
{
  "sections": [
    {
      "title": "Clinical Assessment",
      "content": "Mrs. Johnson presents with a 3-month history of exertional chest pain consistent with possible angina pectoris. Her cardiovascular risk factors include age, hypertension, and diabetes mellitus."
    },
    {
      "title": "Examination Findings",
      "content": "Blood pressure 145/85 mmHg, pulse 78 regular. Cardiovascular examination normal with no murmurs or added sounds."
    },
    {
      "title": "Investigations",
      "content": "Resting ECG shows normal sinus rhythm with no acute ischaemic changes. Stress testing has been arranged."
    },
    {
      "title": "Management Plan",
      "content": "Commenced aspirin 100mg daily for cardiovascular protection. Awaiting stress test results for further risk stratification."
    }
  ],
  "impression": ["Possible stable angina pectoris", "Cardiovascular risk factor modification required"],
  "plan": ["Stress testing", "Review in 4 weeks", "Optimise blood pressure control", "Continue diabetes management"]
}