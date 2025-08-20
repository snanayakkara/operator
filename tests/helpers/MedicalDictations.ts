/**
 * Medical Dictation Library for Comprehensive Workflow Testing
 * 
 * This library provides realistic medical dictations for each workflow type,
 * with varying complexity levels to test different scenarios.
 */

export interface MedicalDictation {
  simple: string;
  complex: string;
  withComplications: string;
  expectedOutputs: string[];
  expectedSections?: string[];
  estimatedProcessingTime: number; // in milliseconds
}

export const MEDICAL_DICTATIONS: Record<string, MedicalDictation> = {
  // Documentation Workflows
  'quick-letter': {
    simple: 'Patient seen in clinic today for follow-up of coronary artery disease. Patient reports feeling well with no chest pain or shortness of breath. Medications continue as prescribed. Plan to continue current therapy and follow up in 3 months.',
    complex: 'Thank you for referring this 68-year-old gentleman with a background of ischaemic heart disease, previous CABG in 2019, and recent non-ST elevation myocardial infarction managed with PCI to the LAD. He presents today for routine cardiology follow-up. His symptoms have significantly improved since the intervention, with no further episodes of chest pain. Current medications include aspirin 100mg daily, clopidogrel 75mg daily, atorvastatin 80mg daily, and metoprolol 50mg twice daily. Recent echocardiogram shows preserved left ventricular function with ejection fraction of 55%. Plan to continue dual antiplatelet therapy for 12 months and optimise secondary prevention measures.',
    withComplications: 'Patient presents with recurrent chest pain despite optimal medical therapy following recent PCI. Troponin levels remain elevated at 150 ng/L. ECG shows new T-wave inversions in leads V2-V4. Given the clinical presentation, urgent coronary angiography is recommended to assess for in-stent restenosis or progression of native vessel disease. Patient advised to continue current medications and return immediately if symptoms worsen.',
    expectedOutputs: ['patient', 'clinic', 'follow-up', 'medications', 'plan'],
    expectedSections: ['Assessment', 'Plan', 'Medications'],
    estimatedProcessingTime: 3000
  },

  'consultation': {
    simple: 'Patient referred for assessment of chest pain. 45-year-old male with risk factors including hypertension and family history. Exercise stress test shows no significant abnormalities. Recommend risk factor modification and follow-up in 6 months.',
    complex: 'Comprehensive cardiovascular assessment for this 62-year-old lady with multiple risk factors including diabetes mellitus, hypertension, hyperlipidaemia, and family history of premature coronary artery disease. Presenting complaint of exertional chest discomfort and dyspnoea over the past 3 months. Physical examination reveals elevated blood pressure at 160/95 mmHg, BMI of 32, and soft systolic murmur at the left sternal edge. Investigations include ECG showing left ventricular hypertrophy, echocardiogram demonstrating grade 1 diastolic dysfunction, and exercise stress test positive for inducible ischaemia. Coronary angiography recommended to assess coronary anatomy. Comprehensive risk factor modification program initiated including dietary counselling, weight management, and optimisation of antihypertensive therapy.',
    withComplications: 'Emergency consultation for 58-year-old gentleman presenting with acute chest pain, diaphoresis, and shortness of breath. Initial ECG shows ST-elevation in leads II, III, and aVF consistent with inferior STEMI. Troponin significantly elevated at 2500 ng/L. Patient has known diabetes and previous smoking history. Immediate primary PCI indicated. Activated cardiac catheterisation laboratory and commenced dual antiplatelet therapy, heparin, and high-intensity statin. Family notified of urgent nature of intervention required.',
    expectedOutputs: ['assessment', 'examination', 'investigation', 'recommendation', 'risk factors'],
    expectedSections: ['History', 'Examination', 'Investigations', 'Assessment', 'Plan'],
    estimatedProcessingTime: 5000
  },

  // Complex Procedure Workflows
  'tavi': {
    simple: 'Patient underwent transcatheter aortic valve implantation with a 26mm Edwards Sapien 3 valve via transfemoral approach. Pre-procedure aortic valve area was 0.8 cm squared. Post-procedure gradient is mean 10 mmHg with trivial paravalvular leak. Patient stable post-procedure.',
    complex: 'Complex TAVI procedure performed for severe symptomatic aortic stenosis. Pre-procedure assessment showed aortic valve area of 0.6 cm squared, mean gradient 55 mmHg, and peak velocity 4.8 m/s. Left ventricular ejection fraction was 45% with mild-moderate mitral regurgitation. CT angiography demonstrated suitable anatomy for transfemoral approach with minimal calcification of the annulus. A 29mm Edwards Sapien 3 Ultra valve was successfully deployed at the annular level following balloon pre-dilatation with a 25mm balloon. Post-deployment angiography confirmed excellent valve position with mean gradient reduced to 8 mmHg and valve area increased to 1.9 cm squared. Trace paravalvular leak noted. Left ventricular function appeared improved. Vascular closure achieved with two Perclose devices. Patient transferred to coronary care unit for monitoring.',
    withComplications: 'TAVI procedure complicated by moderate paravalvular leak requiring post-dilatation. Initial deployment of 26mm Edwards Sapien 3 valve showed suboptimal positioning with mean gradient of 18 mmHg and moderate aortic regurgitation. Post-dilatation performed with 28mm balloon resulting in improved haemodynamics with mean gradient reduced to 12 mmHg and mild paravalvular leak. Temporary pacing required for transient complete heart block. Patient developed hypotension requiring vasopressor support. Echocardiography confirmed adequate valve function and the patient stabilised. Permanent pacemaker insertion planned for persistent conduction abnormalities.',
    expectedOutputs: ['TAVI', 'Edwards Sapien', 'transfemoral', 'gradient', 'valve area', 'paravalvular'],
    expectedSections: ['Procedure Details', 'Hemodynamic Results', 'Complications', 'Post-procedure Plan'],
    estimatedProcessingTime: 12000
  },

  'angiogram-pci': {
    simple: 'Coronary angiography showed 80% stenosis in the mid LAD. Successful PCI performed with drug-eluting stent deployment. TIMI 3 flow restored with excellent angiographic result.',
    complex: 'Diagnostic coronary angiography revealed triple vessel disease with 90% stenosis in the proximal LAD involving the diagonal branch, 75% stenosis in the mid RCA, and 85% stenosis in the distal circumflex artery. Left ventricular angiography showed anterior wall hypokinesis with ejection fraction estimated at 45%. PCI performed to the LAD lesion using a 3.0mm x 28mm drug-eluting stent following pre-dilatation with a 2.5mm balloon. Side branch protected with wire. Final angiography demonstrated excellent result with less than 10% residual stenosis and TIMI 3 flow. Patient remained haemodynamically stable throughout the procedure. Plan for staged PCI to remaining vessels pending clinical assessment.',
    withComplications: 'Emergency PCI for STEMI complicated by cardiogenic shock. Coronary angiography revealed total occlusion of the proximal LAD with TIMI 0 flow. Multiple attempts at wire passage required due to heavy thrombus burden. Aspiration thrombectomy performed prior to balloon angioplasty. Two overlapping drug-eluting stents deployed to cover the entire lesion. Final result showed TIMI 2 flow with residual stenosis of 20%. Patient required intra-aortic balloon pump for haemodynamic support. Post-procedure echocardiography showed severe left ventricular dysfunction with ejection fraction of 25%. Transferred to intensive care unit for ongoing management.',
    expectedOutputs: ['coronary angiography', 'stenosis', 'LAD', 'PCI', 'stent', 'TIMI flow'],
    expectedSections: ['Angiographic Findings', 'Intervention Details', 'Final Result', 'Post-procedure Management'],
    estimatedProcessingTime: 15000
  },

  'mteer': {
    simple: 'Mitral transcatheter edge-to-edge repair performed using MitraClip device. Single clip deployed at the central segments reducing mitral regurgitation from severe to mild. Left atrial pressure reduced from 25 to 15 mmHg.',
    complex: 'Complex MitraClip procedure for severe functional mitral regurgitation in the setting of dilated cardiomyopathy. Pre-procedure assessment showed central jet of severe MR with effective regurgitant orifice area of 45 mm squared and regurgitant volume of 65ml. Left ventricular ejection fraction was 30% with dilated left ventricle. Trans-septal puncture performed under TEE guidance with deployment of 24Fr steerable sheath. Two MitraClip NTR devices deployed at A2-P2 and A1-P1 segments following careful leaflet grasping. Post-procedure mitral regurgitation reduced to mild with mean gradient of 3 mmHg across the mitral valve. Left atrial pressure reduced from 28 mmHg to 12 mmHg. No complications encountered. Patient exhibited immediate symptomatic improvement.',
    withComplications: 'MitraClip procedure complicated by single leaflet detachment requiring clip repositioning. Initial clip deployment showed inadequate leaflet insertion with persistent severe mitral regurgitation. Clip removed and repositioned with improved leaflet capture. Second clip required for optimal result. Final assessment showed moderate mitral regurgitation with acceptable gradient. Procedure time extended to 3 hours due to technical challenges. Small pericardial effusion noted on post-procedure echocardiography requiring monitoring. Patient clinically stable with improved symptoms.',
    expectedOutputs: ['MitraClip', 'mitral regurgitation', 'edge-to-edge repair', 'TEE', 'leaflet', 'gradient'],
    expectedSections: ['Pre-procedure Assessment', 'Procedure Details', 'Post-procedure Results', 'Complications'],
    estimatedProcessingTime: 10000
  },

  'pfo-closure': {
    simple: 'Patent foramen ovale closure performed using 25mm Amplatzer Septal Occluder. Device deployed without complications with good position and no residual shunt.',
    complex: 'Percutaneous patent foramen ovale closure indicated for recurrent cryptogenic stroke prevention. Pre-procedure assessment with contrast echocardiography and TEE confirmed large PFO with atrial septal aneurysm and significant right-to-left shunting. Procedure performed under general anaesthesia with TEE guidance. Right heart catheterisation showed normal pulmonary pressures. A 30mm Amplatzer PFO Occluder device successfully deployed across the defect with excellent position. Post-deployment imaging confirmed complete closure of the PFO with no residual shunting. Device appeared well-seated with no impingement on surrounding structures. Patient recovered well with no neurological deficit.',
    withComplications: 'PFO closure complicated by device embolisation requiring percutaneous retrieval. Initial 25mm device showed suboptimal position with movement across the septum. Device retrieved using snare catheter and larger 30mm device successfully deployed. TEE confirmed appropriate positioning with complete defect closure. Procedure time prolonged but no permanent complications. Patient monitored overnight and discharged the following day with aspirin therapy.',
    expectedOutputs: ['PFO closure', 'Amplatzer', 'septal occluder', 'shunt', 'atrial septal', 'TEE'],
    expectedSections: ['Indication', 'Procedure Details', 'Device Deployment', 'Post-procedure Assessment'],
    estimatedProcessingTime: 8000
  },

  'right-heart-cath': {
    simple: 'Right heart catheterisation performed via femoral venous access. Right atrial pressure 8 mmHg, pulmonary artery pressure 35/15 mmHg, pulmonary capillary wedge pressure 12 mmHg. Cardiac output 5.2 L/min by thermodilution.',
    complex: 'Comprehensive right heart catheterisation with exercise testing for evaluation of dyspnoea. Resting haemodynamics showed right atrial pressure of 6 mmHg, right ventricular pressure 45/8 mmHg, pulmonary artery pressure 45/18 mmHg with mean of 28 mmHg, and pulmonary capillary wedge pressure of 10 mmHg. Cardiac output was 4.8 L/min with cardiac index of 2.6 L/min/m². Pulmonary vascular resistance calculated at 375 dynes.sec.cm⁻⁵. Exercise testing with 25 watts showed appropriate rise in cardiac output to 7.2 L/min with pulmonary capillary wedge pressure increasing to 18 mmHg. No evidence of pulmonary hypertension or heart failure with preserved ejection fraction.',
    withComplications: 'Right heart catheterisation complicated by ventricular arrhythmias during catheter manipulation. Initial attempt via right femoral vein unsuccessful due to catheter loop formation. Alternative access via left femoral vein achieved successful catheter positioning. Haemodynamics revealed elevated right-sided pressures with right atrial pressure 15 mmHg and pulmonary artery pressure 65/25 mmHg consistent with pulmonary hypertension. Vasodilator testing with adenosine showed minimal response. Patient experienced transient hypotension requiring fluid resuscitation. Procedure completed successfully with anticoagulation maintained throughout.',
    expectedOutputs: ['right heart catheterisation', 'pulmonary artery pressure', 'cardiac output', 'thermodilution', 'wedge pressure'],
    expectedSections: ['Hemodynamic Assessment', 'Pressure Measurements', 'Cardiac Output', 'Clinical Interpretation'],
    estimatedProcessingTime: 10000
  },

  // Utility Workflows
  'investigation-summary': {
    simple: 'Echocardiogram shows normal left ventricular function with ejection fraction 60%. No significant valvular disease. Stress test negative for ischaemia.',
    complex: 'Comprehensive cardiovascular assessment including: Echocardiography demonstrating mild left ventricular hypertrophy with preserved systolic function (EF 58%), grade 1 diastolic dysfunction, mild mitral regurgitation, and normal right heart. Exercise stress test achieved 85% maximum predicted heart rate with no chest pain or ECG changes. Nuclear perfusion study showed no reversible perfusion defects. CT coronary angiography revealed mild non-obstructive plaque in the LAD with calcium score of 120. 24-hour Holter monitor showed occasional ventricular ectopics with no sustained arrhythmias.',
    withComplications: 'Investigation results concerning for significant coronary disease: Exercise ECG positive at 6 minutes with 2mm ST depression in leads V4-V6 associated with typical chest pain. Echocardiogram shows regional wall motion abnormalities affecting the anterior wall with mildly reduced ejection fraction of 45%. Nuclear stress test confirms reversible perfusion defect in the LAD territory. Urgent coronary angiography recommended. Patient symptomatic with NYHA class II symptoms.',
    expectedOutputs: ['echocardiogram', 'ejection fraction', 'stress test', 'investigation', 'results'],
    expectedSections: ['Imaging Results', 'Functional Assessment', 'Clinical Correlation'],
    estimatedProcessingTime: 4000
  },

  'background': {
    simple: 'Patient has a history of hypertension and diabetes mellitus type 2. Currently on metformin and ACE inhibitor. No known drug allergies.',
    complex: 'Past medical history significant for ischaemic heart disease with previous anterior myocardial infarction in 2018 treated with primary PCI to the LAD. Subsequent development of ischaemic cardiomyopathy with ejection fraction of 35%. Background includes diabetes mellitus type 2 diagnosed 15 years ago, well-controlled on metformin and insulin. Hypertension managed with ACE inhibitor and beta-blocker. Previous smoking history of 40 pack-years, ceased 5 years ago. Family history notable for premature coronary disease in father. Current medications include aspirin, clopidogrel, atorvastatin, metoprolol, lisinopril, metformin, and insulin. No known drug allergies.',
    withComplications: 'Complex medical history including recurrent myocardial infarction with three previous PCIs between 2016-2020. Progressive heart failure with current ejection fraction 30% despite optimal medical therapy. Multiple comorbidities including chronic kidney disease stage 3b, atrial fibrillation on warfarin, and insulin-dependent diabetes with diabetic nephropathy. Previous CVA in 2019 with residual mild left-sided weakness. Recent hospitalisation for decompensated heart failure requiring intravenous diuretics. Extensive medication list with frequent dose adjustments due to renal impairment.',
    expectedOutputs: ['medical history', 'medications', 'allergies', 'risk factors', 'comorbidities'],
    expectedSections: ['Past Medical History', 'Current Medications', 'Allergies', 'Social History'],
    estimatedProcessingTime: 3500
  },

  'medication': {
    simple: 'Current medications include aspirin 100mg daily, atorvastatin 40mg nocte, and metoprolol 25mg twice daily. Good compliance reported. No adverse effects.',
    complex: 'Comprehensive medication review: Aspirin 100mg daily for secondary prevention, clopidogrel 75mg daily (continue for 12 months post-PCI), atorvastatin 80mg nocte with recent lipid profile showing LDL 1.8 mmol/L, metoprolol 50mg twice daily with heart rate well-controlled, lisinopril 10mg daily with blood pressure target <130/80, metformin 1000mg twice daily with HbA1c 7.2%, and warfarin 5mg daily with INR target 2.0-3.0. Patient demonstrates excellent compliance. No drug interactions identified. Renal function stable with eGFR 55 ml/min/1.73m².',
    withComplications: 'Medication management complicated by multiple drug interactions and adverse effects. Patient developed muscle aches on high-dose statin requiring dose reduction. ACE inhibitor caused persistent dry cough, switched to ARB. Beta-blocker dose limited by bradycardia and fatigue. Warfarin therapy challenging due to variable INR readings requiring frequent monitoring. Recent addition of diuretic for fluid retention. Patient requires regular medication review due to changing renal function and multiple specialists involved in care.',
    expectedOutputs: ['medications', 'dosage', 'compliance', 'adverse effects', 'interactions'],
    expectedSections: ['Current Medications', 'Compliance Assessment', 'Adverse Effects', 'Drug Interactions'],
    estimatedProcessingTime: 3000
  },

  'ai-medical-review': {
    simple: 'Patient on aspirin and statin therapy following recent MI. Blood pressure well controlled. No contraindications to current therapy identified.',
    complex: 'Comprehensive review of 65-year-old male post-STEMI: Currently on dual antiplatelet therapy (aspirin + clopidogrel), high-intensity statin, ACE inhibitor, and beta-blocker consistent with guideline-directed medical therapy. Recent echocardiogram shows LVEF 45% indicating need for optimisation of heart failure therapy. Blood pressure 135/85 suggests room for ACE inhibitor up-titration. HbA1c 8.1% indicates suboptimal diabetes control requiring medication intensification. Lipid profile shows LDL 2.1 mmol/L above target of <1.4 mmol/L. Consider statin intensification or addition of ezetimibe. No contraindications to evidence-based therapies identified.',
    withComplications: 'Clinical review identifies multiple opportunities for therapy optimisation in high-risk cardiovascular patient: Heart failure therapy suboptimal with LVEF 30% but no ACE inhibitor documented - consider initiation if no contraindications. Diabetes management inadequate with HbA1c 9.2% - urgent endocrinology referral indicated. Lipid management insufficient with LDL 3.1 mmol/L despite statin therapy - combination therapy required. Blood pressure 155/95 indicates need for antihypertensive intensification. Patient not on guideline-recommended beta-blocker post-MI. Multiple evidence-based therapies missing representing significant therapeutic gaps.',
    expectedOutputs: ['guideline', 'therapy optimisation', 'clinical review', 'evidence-based', 'risk factors'],
    expectedSections: ['Clinical Assessment', 'Therapy Review', 'Recommendations', 'Risk Stratification'],
    estimatedProcessingTime: 6000
  }
};

/**
 * Get all available workflow types from the dictation library
 */
export function getAvailableWorkflows(): string[] {
  return Object.keys(MEDICAL_DICTATIONS);
}

/**
 * Get dictation by workflow type and complexity
 */
export function getDictation(workflowType: string, complexity: 'simple' | 'complex' | 'withComplications' = 'simple'): string {
  const dictation = MEDICAL_DICTATIONS[workflowType];
  if (!dictation) {
    throw new Error(`No dictation available for workflow type: ${workflowType}`);
  }
  return dictation[complexity];
}

/**
 * Get expected outputs for validation
 */
export function getExpectedOutputs(workflowType: string): string[] {
  const dictation = MEDICAL_DICTATIONS[workflowType];
  if (!dictation) {
    throw new Error(`No dictation available for workflow type: ${workflowType}`);
  }
  return dictation.expectedOutputs;
}

/**
 * Get expected processing time for performance testing
 */
export function getExpectedProcessingTime(workflowType: string): number {
  const dictation = MEDICAL_DICTATIONS[workflowType];
  if (!dictation) {
    throw new Error(`No dictation available for workflow type: ${workflowType}`);
  }
  return dictation.estimatedProcessingTime;
}

/**
 * Get random dictation for stress testing
 */
export function getRandomDictation(): { workflowType: string; complexity: string; text: string } {
  const workflows = getAvailableWorkflows();
  const complexities = ['simple', 'complex', 'withComplications'] as const;
  
  const randomWorkflow = workflows[Math.floor(Math.random() * workflows.length)];
  const randomComplexity = complexities[Math.floor(Math.random() * complexities.length)];
  
  return {
    workflowType: randomWorkflow,
    complexity: randomComplexity,
    text: getDictation(randomWorkflow, randomComplexity)
  };
}