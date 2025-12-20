// Export all specialized medical agents

// Priority agents (implemented)
export { TAVIAgent } from './TAVIAgent';
export { AngiogramPCIAgent } from './AngiogramPCIAgent';
export { QuickLetterAgent } from './QuickLetterAgent';
export { ConsultationAgent } from './ConsultationAgent';
export { InvestigationSummaryAgent } from './InvestigationSummaryAgent';
export { BackgroundAgent } from './BackgroundAgent';
export { MedicationAgent } from './MedicationAgent';
export { BloodsAgent } from './BloodsAgent';
export { ImagingAgent } from './ImagingAgent';
export { TAVIWorkupAgent } from './TAVIWorkupAgent';

// Additional agents (implemented)
export { MTEERAgent } from './MTEERAgent';
export { PFOClosureAgent } from './PFOClosureAgent';
export { RightHeartCathAgent } from './RightHeartCathAgent';
export { BatchPatientReviewAgent } from './BatchPatientReviewAgent';
export { PatientEducationAgent } from './PatientEducationAgent';

// Post-processing agents
export { NextStepInferenceAgent, getNextStepInferenceAgent } from './NextStepInferenceAgent';

// Agent registration helper
// All agents are exported above for lazy loading
