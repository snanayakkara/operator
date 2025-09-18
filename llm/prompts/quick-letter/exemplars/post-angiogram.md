---
tags: ["post-angiogram", "procedure-followup", "CAD", "PCI"]
dx: "Three vessel coronary artery disease - post PCI to LAD"
audience: "cardiologist"
tone: "technical"
---

# INPUT_TRANSCRIPT
Mr. Smith underwent coronary angiography yesterday which revealed three vessel coronary artery disease. There was a tight 90% stenosis in the proximal LAD, 70% stenosis in the circumflex, and 60% stenosis in the RCA. We proceeded with PCI to the LAD lesion using a drug-eluting stent. The procedure was uncomplicated with excellent angiographic result and TIMI 3 flow restored. He is currently on dual antiplatelet therapy with aspirin and ticagrelor. His cholesterol needs optimisation and I've started high-dose atorvastatin. He will need staged PCI to the circumflex in 6-8 weeks. Please continue his current heart failure medications.

# TARGET_LETTER_JSON
{
  "sections": [
    {
      "title": "Procedure Summary",
      "content": "Coronary angiography revealed three vessel coronary artery disease with 90% proximal LAD stenosis, 70% circumflex stenosis, and 60% RCA stenosis."
    },
    {
      "title": "Intervention",
      "content": "Successful PCI to proximal LAD lesion with drug-eluting stent deployment. Excellent angiographic result achieved with TIMI 3 flow restoration."
    },
    {
      "title": "Current Medications",
      "content": "Dual antiplatelet therapy commenced: aspirin with ticagrelor. High-dose atorvastatin initiated for lipid management."
    },
    {
      "title": "Ongoing Management",
      "content": "Staged PCI to circumflex lesion planned in 6-8 weeks. Continue existing heart failure medications."
    }
  ],
  "impression": ["Three vessel CAD", "Successful LAD PCI", "Residual disease requiring staged intervention"],
  "plan": ["Continue DAPT", "Staged circumflex PCI in 6-8 weeks", "Optimise medical therapy", "Cardiac rehabilitation"]
}