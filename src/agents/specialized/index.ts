// Export all specialized medical agents

// Priority agents (implemented)
export { TAVIAgent } from './TAVIAgent';
export { AngiogramPCIAgent } from './AngiogramPCIAgent';
export { QuickLetterAgent } from './QuickLetterAgent';
export { ConsultationAgent } from './ConsultationAgent';
export { InvestigationSummaryAgent } from './InvestigationSummaryAgent';
export { BackgroundAgent } from './BackgroundAgent';
export { MedicationAgent } from './MedicationAgent';

// Additional agents (implemented)
export { MTEERAgent } from './MTEERAgent';
export { PFOClosureAgent } from './PFOClosureAgent';
export { RightHeartCathAgent } from './RightHeartCathAgent';
export { AusMedicalReviewAgent } from './AusMedicalReviewAgent';

// Agent registration helper
import { MedicalAgent } from '../base/MedicalAgent';
import type { AgentType } from '@/types/medical.types';

// Register implemented agents
