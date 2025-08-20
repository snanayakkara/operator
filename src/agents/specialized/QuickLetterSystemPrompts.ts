/**
 * System prompts and medical correspondence templates for Quick Letter Agent
 * Extracted from Reflow2 system with comprehensive medical letter formatting standards
 */

export const QUICK_LETTER_SYSTEM_PROMPTS = {
  primary: `You are a specialist physician reformating a *direct dictation* into polished prose paragraphs for a referring doctor.

CRITICAL INSTRUCTIONS:
- Rewrite **only** what is explicitly dictated.  
- **Do NOT** add, infer, or invent information (labs, medication doses, diagnoses, extra sentences, etc.).  
- Keep first‑person voice (e.g., "I reviewed …").  
- **No salutation, greeting, headings, sign‑off, or signature block.**  
- Use digits for numbers with units (e.g., 10 mg) and Australian spelling.
- Separate paragraphs with a single blank line; otherwise retain the narrator’s flow.  

OUTPUT FORMAT - You MUST provide BOTH a summary and the full letter in this EXACT format. Do NOT deviate from this structure:

SUMMARY: [Write a concise third-person clinical summary in 150 characters or less. Use short clinical statements without flowing sentences. Focus on: primary diagnosis, key complications, treatment plan. No personal pronouns (I/he/she). Example: "Pulmonary sarcoidosis with massive fibrosis. Severe pulmonary hypertension. Not suitable for transplant. Consider vasodilatory therapy."]
---
LETTER: [The full rewritten letter content as polished prose paragraphs]

CRITICAL REQUIREMENTS:
- You MUST use exactly "SUMMARY:" followed by the summary text
- You MUST use exactly "---" as the separator 
- You MUST use exactly "LETTER:" followed by the letter content
- The summary MUST be 150 characters or less
- The letter MUST be formatted with proper paragraphs separated by blank lines
- Do NOT add any other text, headers, or formatting outside this structure

EXAMPLE FORMAT:
SUMMARY: Patient presents with chest pain. ECG shows ST elevation. Primary PCI performed with drug-eluting stent to LAD. Good angiographic result.
---
LETTER: Thank you for referring this 65-year-old gentleman who presented with acute chest pain.

He developed severe central chest pain at 2 PM today while at rest. The pain was crushing in nature and radiated to his left arm. He had associated nausea and diaphoresis.

His ECG showed ST elevation in leads V2-V6, consistent with an anterior STEMI. We proceeded immediately to primary PCI.

If you cannot produce a coherent rewrite *without adding information*, output exactly:
ERROR – dictation could not be parsed coherently.`
};

// Templates no longer required; kept as empty object to preserve imports.
export const QUICK_LETTER_TEMPLATES = {};

export const QUICK_LETTER_MEDICAL_KNOWLEDGE = {
  // Urgency classifications with timeframes
  urgencyLevels: {
    'routine': {
      timeframe: 'within 6-8 weeks',
      description: 'routine outpatient assessment',
      indicator: 'Routine referral'
    },
    'semi_urgent': {
      timeframe: 'within 2-4 weeks', 
      description: 'semi-urgent clinical review',
      indicator: 'Semi-urgent referral'
    },
    'urgent': {
      timeframe: 'within 1-2 weeks',
      description: 'urgent specialist assessment',
      indicator: 'URGENT referral'
    },
    'very_urgent': {
      timeframe: 'within 48-72 hours',
      description: 'very urgent clinical review',
      indicator: 'VERY URGENT'
    },
    'immediate': {
      timeframe: 'same day assessment',
      description: 'immediate specialist consultation',
      indicator: 'IMMEDIATE ASSESSMENT REQUIRED'
    }
  },

  // Medical abbreviations (expanded forms for letters)
  medicalAbbreviations: {
    'BP': 'blood pressure',
    'HR': 'heart rate', 
    'RR': 'respiratory rate',
    'SaO2': 'oxygen saturation',
    'ECG': 'electrocardiogram',
    'CXR': 'chest X-ray',
    'CT': 'computed tomography',
    'MRI': 'magnetic resonance imaging',
    'Echo': 'echocardiogram',
    'CABG': 'coronary artery bypass graft',
    'PCI': 'percutaneous coronary intervention',
    'MI': 'myocardial infarction',
    'STEMI': 'ST-elevation myocardial infarction',
    'NSTEMI': 'non-ST elevation myocardial infarction',
    'UA': 'unstable angina',
    'CCF': 'congestive cardiac failure',
    'HF': 'heart failure',
    'AF': 'atrial fibrillation',
    'VT': 'ventricular tachycardia',
    'VF': 'ventricular fibrillation',
    'TIA': 'transient ischaemic attack',
    'CVA': 'cerebrovascular accident',
    'PE': 'pulmonary embolism',
    'DVT': 'deep vein thrombosis',
    'DM': 'diabetes mellitus',
    'HTN': 'hypertension',
    'IHD': 'ischaemic heart disease',
    'COPD': 'chronic obstructive pulmonary disease',
    'CKD': 'chronic kidney disease',
    'ACE': 'angiotensin-converting enzyme',
    'ARB': 'angiotensin receptor blocker',
    'CCB': 'calcium channel blocker',
    'DAPT': 'dual antiplatelet therapy',
    'OAC': 'oral anticoagulation',
    'NSAID': 'non-steroidal anti-inflammatory drug',
    'PPI': 'proton pump inhibitor',
    'GFR': 'glomerular filtration rate',
    'LDL': 'low-density lipoprotein',
    'HDL': 'high-density lipoprotein',
    'HbA1c': 'glycated haemoglobin',
    'TSH': 'thyroid stimulating hormone',
    'FBC': 'full blood count',
    'UEC': 'urea, electrolytes and creatinine',
    'LFT': 'liver function tests',
    'INR': 'international normalised ratio',
    'PT': 'prothrombin time',
    'APTT': 'activated partial thromboplastin time'
  },

  // Common medical conditions for letter context
  medicalConditions: {
    'cardiovascular': [
      'coronary artery disease', 'stable angina', 'unstable angina', 'microvascular angina', 'vasospastic angina',
      'myocardial infarction', 'ischaemic cardiomyopathy',
      'heart failure', 'heart failure with reduced ejection fraction', 'heart failure with preserved ejection fraction',
      'atrial fibrillation', 'atrial flutter', 'supraventricular tachycardia', 'ventricular tachycardia', 'ventricular ectopy',
      'bradyarrhythmia', 'sick sinus syndrome', 'atrioventricular block', 'bundle branch block', 'wolff-parkinson-white syndrome',
      'long qt syndrome', 'brugada syndrome',
      'hypertension', 'resistant hypertension', 'orthostatic hypotension', 'postural orthostatic tachycardia syndrome',
      'valve disease', 'aortic stenosis', 'aortic regurgitation', 'mitral regurgitation', 'mitral stenosis',
      'tricuspid regurgitation', 'tricuspid stenosis', 'pulmonary valve stenosis', 'pulmonary valve regurgitation',
      'cardiomyopathy', 'hypertrophic cardiomyopathy', 'dilated cardiomyopathy', 'restrictive cardiomyopathy',
      'arrhythmogenic right ventricular cardiomyopathy', 'takotsubo cardiomyopathy',
      'pericarditis', 'constrictive pericarditis', 'pericardial effusion', 'cardiac tamponade', 'myocarditis',
      'pulmonary hypertension',
      'peripheral arterial disease',
      'abdominal aortic aneurysm', 'thoracic aortic aneurysm', 'aortic dissection',
      'bicuspid aortic valve', 'atrial septal defect', 'ventricular septal defect', 'patent foramen ovale',
      'rheumatic heart disease', 'infective endocarditis',
      'spontaneous coronary artery dissection', 'coronary artery spasm',
      'dyslipidaemia', 'hypercholesterolaemia', 'familial hypercholesterolaemia',
      'cardiac amyloidosis', 'cardiac sarcoidosis', 'syncope'
    ],
    'respiratory': [
      'chronic obstructive pulmonary disease', 'asthma', 'pneumonia',
      'pulmonary embolism', 'lung cancer', 'interstitial lung disease'
    ],
    'endocrine': [
      'diabetes mellitus', 'thyroid disease', 'adrenal insufficiency',
      'hyperthyroidism', 'hypothyroidism', 'diabetic complications'
    ],
    'neurological': [
      'stroke', 'transient ischaemic attack', 'epilepsy', 'dementia',
      'Parkinson disease', 'multiple sclerosis', 'neuropathy'
    ],
    'gastrointestinal': [
      'inflammatory bowel disease', 'peptic ulcer disease', 'liver cirrhosis',
      'gastroesophageal reflux disease', 'inflammatory bowel disease'
    ],
    'renal': [
      'chronic kidney disease', 'acute kidney injury', 'nephrotic syndrome',
      'glomerulonephritis', 'kidney stones'
    ]
  },

  // Professional language patterns
  professionalPhrases: {
    'rapport_opening': [
      'I had the pleasure of speaking with {name} today',
      'I saw {name} today',
      'Thank you for reviewing {name} today'
    ],
    'attendance_context': [
      '{name} attended with {companion}',
      'I spoke with {name} together with {companion}'
    ],
    'referral_opening': [
      'Thank you for seeing this patient',
      'I would be grateful if you could see this patient',
      'Please could you assess this patient',
      'I am referring this patient for your opinion'
    ],
    'requesting_opinion': [
      'I would be grateful for your opinion regarding',
      'Please could you advise on',
      'I would appreciate your assessment of',
      'Could you please comment on',
      'I would appreciate your opinion on {name}, a {age}-year-old {sex} with {diagnosis}',
      'I would appreciate if you could review {name} with a view to {procedure}'
    ],
    'temporal_context': [
      'In {timeframe}, {event}',
      'Over the past {duration}, {summary}',
      'Today we discussed {topic}'
    ],
    'presentation_context': [
      'He/She presented to the emergency department',
      'He/She developed {symptom} in the context of {trigger}',
      'From what I can ascertain, {summary}',
      'Initial presentation was with {issue}, which developed during {context}'
    ],
    'clinical_concern': [
      'I am concerned about',
      'The patient presents with',
      'Clinical features suggest',
      'There are concerns regarding'
    ],
    'functional_status': [
      'His/Her current functional class is NYHA {class}',
      'Functional class fluctuates between NYHA {low} to {high}',
      'Symptomatically, he/she is similar overall'
    ],
    'prior_intervention_context': [
      '{years} years following a previous {procedure} performed in {location}',
      'He/She underwent {procedure}, with long-term benefit'
    ],
    'medication_changes': [
      'Minor changes were made to his/her medications',
      'His/Her {medication} was ceased',
      'I recommend we consider recommencing {medication}',
      'He/She will bring medications in next time for review'
    ],
    'positive_progress': [
      'Most pleasingly, he/she has been exercising more',
      'Also notable is the marked improvement in {metric}',
      'He/She is motivated to continue improving with dietary and exercise changes'
    ],
    'investigations_summary': [
      'I arranged {test}, demonstrating {finding}',
      '{test} suggested {finding}, which was {severity} at invasive angiography with {modality}',
      'A {modality} demonstrated {finding}',
      'A local {modality} in {location} confirmed {finding}',
      'Reviewing the images, there is {limitation}, however {interpretation}'
    ],
    'investigations_actions': [
      'He/She has undergone {tests} today at {institution}',
      'I have also requested {test} for {purpose}',
      '...both for {purpose1} as well as planning ahead for {purpose2}'
    ],
    'interim_findings': [
      'Although the formal report is not available, preliminary discussion suggests {finding}',
      'Interim findings are suspicious for {diagnosis}'
    ],
    'procedure_outcome_recurrence': [
      'He/She underwent successful {procedure} with {colleague}, however unfortunately {recurrence} {timeframe} later',
      'He/She was in {rhythm} today, {control_status}'
    ],
    'imaging_detail': [
      'Imaging showed left ventricular function {status}',
      'There was little in the way of {finding}',
      'Right ventricular function was {degree} reduced',
      'A small {effusion} was noted'
    ],
    'technical_feasibility': [
      'From a technical perspective, {procedure} seems possible, albeit challenging due to {reason}',
      'He/She has suitable anatomy for minimally invasive percutaneous {procedure}'
    ],
    'risk_benefit': [
      'I have outlined the procedure in detail, including the risks of {risks}',
      'Taken together, the benefit outweighs the risks in his/her case'
    ],
    'recommendation_plan': [
      'I recommend we perform {test} to determine {goal}',
      'If deemed appropriate, we will arrange for {action}',
      'We will proceed to {next_step} and I will keep you updated'
    ],
    'plan_intro': [
      'From today, our plan is:',
      'Our plan from here is:'
    ],
    'plan_item_templates': [
      'Repeat {test} on return from {event}',
      'Commence {medication} on return',
      'Arrange {scan} to confirm {diagnosis}',
      'Consider {therapy}',
      'Proceed to surgery with {surgeon}',
      'Consider {procedure} following the above'
    ],
    'coordination_team': [
      'After discussing the situation with the heart team at {institution}, I will determine suitability for {procedure}',
      'I will keep you updated on the outcome'
    ],
    'noncardiac_coordination': [
      'I am mindful of not delaying {noncardiac_procedure} with {surgeon}',
      'We will coordinate timing around {external_factor}'
    ],
    'scheduling_follow_up': [
      'I will next see {name} on {date}',
      'I will review {name} sooner if required'
    ],
    'gratitude': [
      'Thank you kindly for your ongoing care',
      'Thank you for your referral',
      'Thank you kindly for seeing {name}'
    ],
    'follow_up': [
      'I am happy to see the patient again if required',
      'Please arrange follow-up as clinically indicated',
      'Follow-up can be arranged as appropriate',
      'I will continue to monitor this patient'
    ],
    'contact': [
      'Please do not hesitate to contact me if you have any questions',
      'Please contact me if you require further information',
      'I am available for discussion if needed',
      'Please feel free to contact me'
    ]
  },

  // Letter formatting standards
  formattingGuidelines: {
    'date_format': 'DD Month YYYY (Australian standard)',
    'address_format': 'Full address with postcode',
    'identification': 'Name, DOB, address, MRN/NHS number',
    'subject_line': 'Re: Patient Name, brief descriptor',
    'paragraph_structure': 'Clear paragraphs with specific headings',
    'contact_details': 'Direct phone, email, department',
    'signature_block': 'Name, title, institution, contact details'
  },

  // Quality indicators for medical letters
  qualityMetrics: {
    'completeness': 'All required sections present',
    'clarity': 'Clear clinical reasoning and requests',
    'professionalism': 'Appropriate tone and language',
    'accuracy': 'Correct medical terminology and facts',
    'timeliness': 'Appropriate urgency indicators',
    'contact': 'Clear contact information provided',
    'confidentiality': 'Patient privacy maintained'
  }
};