export interface MedicalAgent {
  name: string;
  specialty: string;
  description: string;
  process(input: string, context?: MedicalContext): Promise<MedicalReport>;
  getMemory(): AgentMemory;
  setMemory(memory: AgentMemory): void;
}

export interface MedicalContext {
  patientId?: string;
  sessionId: string;
  procedureType?: string;
  emrSystem?: string;
  previousReports?: MedicalReport[];
  timestamp: number;
  isReprocessing?: boolean;
  withMissingInfo?: boolean;
  // Enhanced processing mode (optional)
  processingMode?: 'legacy' | 'enhanced';
  enhancedProcessing?: boolean;
  // Progress tracking for long recordings
  onProgress?: (phase: string, progress: number, details?: string) => void;
  // Cross-agent intelligence properties
  sharedInsights?: any[];
  riskAssessment?: any[];
  drugInteractions?: any[];
  clinicalCorrelations?: any[];
  terminologyPreferences?: string;
  recommendations?: string[];
}

// Custom error interface for enhanced error handling
export interface CustomError extends Error {
  component?: string;
  error?: any;
}

export interface MedicalReport {
  id: string;
  agentName: string;
  content: string;
  summary?: string;
  sections: ReportSection[];
  metadata: ReportMetadata;
  timestamp: number;
  warnings?: string[];
  errors?: string[];
}

export interface ReportSection {
  title: string;
  content: string;
  type: 'narrative' | 'structured' | 'list' | 'table';
  priority: 'high' | 'medium' | 'low';
}

export interface ReportMetadata {
  procedureType?: string;
  medicalCodes?: MedicalCode[];
  missingInformation?: any;
  confidence: number;
  processingTime: number;
  modelUsed: string;
  // Optional enhanced processing metadata extensions
  enhancedProcessing?: Record<string, unknown>;
  validationResults?: Record<string, unknown>;
  enhancedFeatures?: {
    intelligentWaiting?: boolean;
    dataValidation?: boolean;
    errorRecovery?: boolean;
    caching?: boolean;
    checkpointing?: boolean;
    metrics?: boolean;
  };
  // AI reasoning artifacts for transparency (always captured)
  rawAIOutput?: string;
  reasoningArtifacts?: {
    dictationAnalysis?: string;
    summaryPlanning?: string;
    letterPlanning?: string;
    constraintChecklist?: string;
    mentalSandbox?: string;
    confidenceScore?: string;
    otherArtifacts?: string[];
    hasReasoningContent?: boolean;
  };
}

export interface MedicalCode {
  system: 'ICD-10' | 'CPT' | 'SNOMED' | 'LOINC';
  code: string;
  description: string;
}

export interface AgentMemory {
  shortTerm: Record<string, any>;
  longTerm: Record<string, any>;
  procedures: ProcedureMemory[];
  lastUpdated: number;
}

export interface ProcedureMemory {
  type: string;
  date: number;
  details: Record<string, any>;
  outcome?: string;
}

export interface VoiceRecording {
  id: string;
  audioData: Blob;
  duration: number;
  sampleRate: number;
  channels: number;
  timestamp: number;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  segments: TranscriptionSegment[];
  language: string;
  processingTime: number;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
}

export interface FailedAudioRecording {
  id: string;
  audioBlob: Blob;
  timestamp: number;
  agentType: AgentType;
  errorMessage: string;
  transcriptionAttempt?: string;
  metadata: {
    duration: number;
    fileSize: number;
    quality?: 'good' | 'fair' | 'poor';
    recordingTime: number;
  };
}

export interface LMStudioRequest {
  model: string;
  messages?: ChatMessage[];
  prompt?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'model';
  content: string;
}

export interface LMStudioResponse {
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type AgentType =
  | 'tavi'
  | 'angiogram-pci'
  | 'quick-letter'
  | 'consultation'
  | 'investigation-summary'
  | 'background'
  | 'medication'
  | 'bloods'
  | 'imaging'
  | 'mteer'
  | 'tteer'
  | 'pfo-closure'
  | 'asd-closure'
  | 'pvl-plug'
  | 'bypass-graft'
  | 'right-heart-cath'
  | 'tavi-workup'
  | 'ai-medical-review'
  | 'batch-ai-review'
  | 'patient-education'
  | 'ohif-viewer'
  | 'aus-medical-review'
  | 'enhancement'
  | 'transcription'
  | 'generation';

export interface AppState {
  isRecording: boolean;
  isProcessing: boolean;
  currentAgent: AgentType | null;
  transcription: string;
  results: string;
  resultsSummary: string;
  aiGeneratedSummary?: string; // AI-generated summary from agents like QuickLetter
  // Missing information detection and user-supplied answers
  missingInfo?: any;
  missingInfoAnswers?: Record<string, string>;
  processingStatus: ProcessingStatus;
  voiceActivityLevel: number;
  frequencyData: number[];
  modelStatus: ModelStatus;
  // Timing data for performance metrics
  recordingTime: number | null;
  transcriptionTime: number | null;
  agentProcessingTime: number | null;
  totalProcessingTime: number | null;
  currentAgentName: string | null;
  processingStartTime: number | null;
  // Failed audio recordings for troubleshooting
  failedAudioRecordings: FailedAudioRecording[];
  // AI Review structured data
  reviewData?: any;
  // TAVI Workup structured data
  taviStructuredSections?: TAVIWorkupStructuredSections;
  // Patient version generation
  patientVersion: string | null;
  isGeneratingPatientVersion: boolean;
}

export type ProcessingStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'classifying'
  | 'processing'
  | 'enhancing'
  | 'complete'
  | 'error'
  | 'cancelled'
  | 'cancelling';


export interface ModelStatus {
  isConnected: boolean;
  classifierModel: string;
  processorModel: string;
  lastPing: number;
  latency: number;
  whisperServer?: WhisperServerStatus;
  dspyServer?: DSPyServerStatus;
}

export interface WhisperServerStatus {
  running: boolean;
  model?: string;
  port: number;
  error?: string;
  lastChecked: number;
}

export interface DSPyServerStatus {
  running: boolean;
  ready: boolean;
  port: number;
  error?: string;
  lastChecked: number;
  version?: string;
  uptime?: number;
  stats?: {
    requests_processed: number;
    errors_encountered: number;
    active_optimizations: number;
  };
  dspy?: {
    config_loaded: boolean;
    available_agents: string[];
    enabled_agents: string[];
  };
}

export interface EMRField {
  type: string;
  selector: string;
  label: string;
  isRequired: boolean;
  maxLength?: number;
}

export interface EMRSystem {
  name: string;
  baseUrl: string;
  fields: Record<string, EMRField>;
  navigation: Record<string, string>;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => Promise<void>;
  enabled: boolean;
}

export interface ScreenshotCaptureResult {
  success: boolean;
  imageData?: string;
  method: 'tab-capture' | 'clipboard' | 'failed';
  error?: string;
  tabInfo?: {
    title: string;
    url: string;
    windowId: number;
  };
}

// TAVI-specific Medical Types
export interface TAVIReport extends MedicalReport {
  taviData: TAVIData;
  hemodynamics: HemodynamicData;
  valveAssessment: ValveAssessment;
  complications: TAVIComplication[];
}

export interface TAVIData {
  procedureType: 'TAVI' | 'TAVR';
  indication: string;
  riskAssessment: RiskAssessment;
  accessApproach: AccessApproach;
  preImplant: PreImplantData;
  valveDetails: ValveDetails;
  proceduralDetails: ProceduralDetails;
  postImplant: PostImplantData;
  immediateOutcomes: string;
  recommendations: string;
  followUp: string;
}

export interface RiskAssessment {
  stsScore?: string;
  euroscore?: string;
  frailtyAssessment?: string;
}

export interface AccessApproach {
  primary: 'transfemoral' | 'transapical' | 'transaortic' | 'transcaval' | 'transcarotid';
  description: string;
}

export interface PreImplantData {
  aorticValveArea: string;
  meanGradient: string;
  peakGradient: string;
  lvef: string;
  annulusDimensions: AnnulusDimensions;
}

export interface AnnulusDimensions {
  minDiameter?: string;
  maxDiameter?: string;
  area?: string;
  perimeter?: string;
}

export interface ValveDetails {
  manufacturer: ValveManufacturer;
  model: string;
  size: ValveSize;
  positioning: string;
  deploymentTechnique: string;
}

export type ValveManufacturer = 'Edwards SAPIEN' | 'Medtronic Evolut' | 'Boston Scientific ACURATE' | 'Abbott Portico' | 'Boston Scientific Lotus';
export type ValveSize = '20mm' | '23mm' | '26mm' | '29mm' | '34mm';

export interface ProceduralDetails {
  contrastVolume: string;
  fluoroscopyTime: string;
  complications: string;
  pacingRequired: string;
  postDilatation: string;
}

export interface PostImplantData {
  valvePosition: string;
  aorticRegurgitation: AorticRegurgitationGrade;
  meanGradient: string;
  peakGradient: string;
  lvef: string;
  conductionIssues: string;
}

export type AorticRegurgitationGrade = 'none' | 'trace' | 'mild' | 'moderate' | 'severe';

export interface HemodynamicData {
  preImplant: HemodynamicMeasurements;
  postImplant: HemodynamicMeasurements;
  gradientImprovement: GradientImprovement;
}

export interface HemodynamicMeasurements {
  meanGradient?: string;
  peakGradient?: string;
  invasiveGradient?: string;
  valveArea?: string;
  lvef?: string;
  lvedp?: string;
  calciumScore?: string;
}

export interface GradientImprovement {
  meanGradient?: string;
  peakGradient?: string;
  description?: string;
}

export interface ValveAssessment {
  deploymentSuccess: 'successful' | 'complicated' | 'unknown';
  positionRelativeToAnnulus: string;
  valveGeometry: string;
  paravalvularLeak: 'minimal' | 'mild' | 'moderate' | 'severe' | 'unknown';
  complications: string[];
}

export interface TAVIComplication {
  type: 'valve_migration' | 'paravalvular_leak' | 'coronary_occlusion' | 'conduction_block' | 'other';
  severity: 'minor' | 'major' | 'life-threatening';
  description: string;
  management?: string;
}

// TAVI Workup Types
export interface TAVIWorkupReport extends MedicalReport {
  workupData: TAVIWorkupData;
  alerts: TAVIWorkupAlerts;
  missingFields: string[];
  // New JSON structure for narrative-based PDF export
  structuredSections?: TAVIWorkupStructuredSections;
}

// New interface for JSON narrative structure matching system prompt output
export interface TAVIWorkupStructuredSections {
  patient: TAVIWorkupSection;
  clinical: TAVIWorkupSection;
  laboratory: TAVIWorkupSection;
  ecg: TAVIWorkupSection;
  background: TAVIWorkupSection;
  medications: TAVIWorkupSection;
  social_history: TAVIWorkupSection;
  investigations: TAVIWorkupSection;
  echocardiography: TAVIWorkupSection;
  enhanced_ct: TAVIWorkupSection;
  procedure_planning: TAVIWorkupSection;
  alerts: TAVIWorkupSection;
  missing_summary: TAVIWorkupMissingSummary;
}

export interface TAVIWorkupSection {
  content: string;
  missing: string[];
  // Pre-anaesthetic review fields (only for alerts section)
  pre_anaesthetic_review_text?: string;
  pre_anaesthetic_review_json?: any;
}

export interface TAVIWorkupMissingSummary {
  missing_clinical: string[];
  missing_diagnostic: string[];
  missing_measurements: string[];
  completeness_score: string;
}

export interface TAVIWorkupData {
  patient: TAVIWorkupPatient;
  clinical: TAVIWorkupClinical;
  laboratory: TAVIWorkupLaboratory;
  ecg: TAVIWorkupECG;
  echocardiography: TAVIWorkupEchocardiography;
  ctMeasurements: TAVIWorkupCTMeasurements;
  procedurePlan: TAVIWorkupProcedurePlan;
  devicesPlanned?: string;
}

export interface TAVIWorkupPatient {
  name?: string;
  dob?: string;
  ageYears?: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  bsaMosteller?: number;
}

export interface TAVIWorkupClinical {
  indication?: string;
  nyhaClass?: 'I' | 'II' | 'III' | 'IV';
  stsPercent?: number;
  euroScorePercent?: number;
}

export interface TAVIWorkupLaboratory {
  creatinine?: number; // μmol/L
  egfr?: number; // mL/min/1.73m²
  hemoglobin?: number; // g/L
  albumin?: number; // g/L
}

export interface TAVIWorkupECG {
  rate?: number; // bpm
  rhythm?: string; // e.g., "SR", "AF", "sinus rhythm", "atrial fibrillation"
  morphology?: string; // e.g., "narrow", "LBBB", "RBBB", "normal"
  qrsWidthMs?: number; // ms
  prIntervalMs?: number; // ms
}

export interface TAVIWorkupEchocardiography {
  studyDate?: string;
  ejectionFractionPercent?: number;
  septalThicknessMm?: number;
  meanGradientMmHg?: number;
  aorticValveAreaCm2?: number;
  dimensionlessIndex?: number;
  mitralRegurgitationGrade?: string;
  rightVentricularSystolicPressureMmHg?: number;
  comments?: string;
}

export interface TAVIWorkupCTMeasurements {
  annulusAreaMm2?: number;
  annulusPerimeterMm?: number;
  annulusMinDiameterMm?: number;
  annulusMaxDiameterMm?: number;
  coronaryHeights: {
    leftMainMm?: number;
    rightCoronaryMm?: number;
  };
  sinusOfValsalva: {
    leftMm?: number;
    rightMm?: number;
    nonCoronaryMm?: number;
  };
  coplanarAngles: string[];
  accessVessels: {
    rightCIAmm?: number;
    leftCIAmm?: number;
    rightEIAmm?: number;
    leftEIAmm?: number;
    rightCFAmm?: number;
    leftCFAmm?: number;
  };
  // Enhanced LVOT measurements
  lvotAreaMm2?: number;
  lvotPerimeterMm?: number;
  stjDiameterMm?: number;
  stjHeightMm?: number;
  // Calcium scoring
  calciumScore?: number;
  lvotCalciumScore?: number;
  // Detailed aortic measurements
  aorticDimensions?: {
    [key: string]: number; // Flexible for various aortic measurements
  };
}

export interface TAVIWorkupProcedurePlan {
  valveSelection: {
    type?: string; // e.g., "Edwards", "Medtronic CoreValve", "Boston Scientific Lotus"
    size?: string; // e.g., "26mm", "29mm"
    model?: string; // e.g., "SAPIEN 3", "Evolut R"
    reason?: string; // e.g., "future coronary access", "optimal sizing"
  };
  access: {
    primary?: string; // e.g., "RFA", "LFA", "Right femoral artery"
    secondary?: string; // e.g., "Right radial artery", "Left radial"
    wire?: string; // e.g., "Confida", "Safari", "Lunderquist"
  };
  strategy: {
    pacing?: string; // e.g., "Femoral venous", "Right ventricular", "Transvenous"
    bav?: string; // e.g., "20mm", "22mm", "Not planned"
    closure?: string; // e.g., "ProStyle + AngioSeal", "Perclose", "Manual compression"
    protamine?: boolean; // true/false for protamine reversal
  };
  goals?: string; // e.g., "Suitable for OT", "Minimize contrast", "Preserve coronary access"
  caseNotes?: string; // e.g., "Future PCI to LAD; consider guide picture at end"
}

export interface TAVIWorkupAlerts {
  alertMessages: string[];
  triggers: {
    lowLeftMainHeight: boolean;
    lowSinusDiameters: string[];
    smallAccessVessels: string[];
  };
}

// Medical Image Analysis Types
export interface MedicalImageAnalysis {
  imageType: 'echocardiogram' | 'fluoroscopy' | 'angiogram' | 'ct_scan' | 'unknown';
  procedureStage: 'pre_implant' | 'deployment' | 'post_implant' | 'positioning' | 'unknown';
  findings: string;
  valvePosition?: ValvePosition;
  coronaryAssessment?: CoronaryAssessment;
  complications?: string[];
}

export interface ValvePosition {
  wellPositioned: boolean;
  annulusPosition: string;
  depth: 'appropriate' | 'too_ventricular' | 'too_aortic' | 'unknown';
  orientation: string;
}

export interface CoronaryAssessment {
  leftMain: 'patent' | 'compromised' | 'unknown';
  rightCoronary: 'patent' | 'compromised' | 'unknown';
  overallAssessment: 'patent' | 'compromised' | 'unknown';
}

// Quick Letter specific types
export interface QuickLetterReport extends MedicalReport {
  letterData: QuickLetterData;
  letterType: QuickLetterType;
  urgencyLevel: UrgencyLevel;
  recipient: RecipientType;
}

export interface QuickLetterData {
  letterType: QuickLetterType;
  urgency: UrgencyLevel;
  recipient: RecipientType;
  patientDetails: PatientDetails;
  clinicalContent: string[];
  medications: string[];
  followUpRequired: string[];
  salutation: string;
  closing: string;
}

export type QuickLetterType = 
  | 'referral'
  | 'follow_up'
  | 'discharge'
  | 'consultation'
  | 'results'
  | 'medication'
  | 'general'
  | 'clinic'
  | 'progress';

export type UrgencyLevel = 
  | 'routine'
  | 'semi_urgent'
  | 'urgent'
  | 'very_urgent'
  | 'immediate';

export type RecipientType = 
  | 'colleague'
  | 'gp'
  | 'cardiologist'
  | 'specialist'
  | 'consultant'
  | 'registrar'
  | 'team'
  | 'nurse'
  | 'unknown';

export interface PatientDetails {
  name?: string;
  age?: string;
  gender?: string;
  dob?: string;
  address?: string;
  mrn?: string;
  identifiers?: string[];
}

// Enhanced patient information for session management
export interface PatientInfo {
  name: string;
  id: string;
  dob: string;
  age: string;
  phone?: string;
  email?: string;
  medicare?: string;
  insurance?: string;
  address?: string;
  extractedAt: number;
}

// Patient session for multi-patient workflow management
export type SessionStatus = 
  | 'recording'
  | 'transcribing' 
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface PatientSession {
  id: string;
  patient: PatientInfo;
  transcription: string;
  results: string;
  summary?: string; // Summary for dual card display (especially for QuickLetter)
  taviStructuredSections?: TAVIWorkupStructuredSections; // TAVI structured data for specialized display
  agentType: AgentType;
  agentName: string;
  timestamp: number;
  status: SessionStatus;
  completed: boolean; // Kept for backward compatibility
  processingTime?: number;
  warnings?: string[];
  errors?: string[];
  // Additional fields for parallel processing
  recordingStartTime?: number;
  transcriptionStartTime?: number;
  processingStartTime?: number;
  completedTime?: number;
  audioBlob?: Blob; // Store audio for reprocessing
  // Progress tracking for long recordings (TAVI workup)
  processingProgress?: {
    phase: string;
    progress: number;
    details?: string;
  };
}

export interface LetterTemplate {
  type: QuickLetterType;
  structure: string[];
  salutations: Record<RecipientType, string>;
  closings: Record<string, string>;
  template: string;
}

export interface MedicalCorrespondence {
  id: string;
  letterType: QuickLetterType;
  urgency: UrgencyLevel;
  recipient: RecipientType;
  subject: string;
  content: string;
  clinicalData: Record<string, any>;
  dateCreated: number;
  lastModified: number;
}

// mTEER specific types
export interface MTEERReport extends MedicalReport {
  mteerData: MTEERData;
  mitralRegurgitation: MitralRegurgitationData;
  clipAssessment: ClipAssessment;
  complications: MTEERComplication[];
}

export interface MTEERData {
  procedureType: 'mTEER';
  indication: string;
  anatomicalAssessment: AnatomicalAssessment;
  deviceDetails: ClipDeviceDetails;
  proceduralDetails: MTEERProceduralDetails;
  immediateOutcomes: string;
  recommendations: string;
  followUp: string;
}

export interface AnatomicalAssessment {
  leafletMorphology: string;
  coaptationLength: string;
  calcification: string;
  mobility: string;
}

export interface ClipDeviceDetails {
  manufacturer: string;
  model: string;
  deliverySystem: string;
  guideCatheter: string;
}

export interface MTEERProceduralDetails {
  toeGuidance: string;
  transseptalPuncture: string;
  clipDeployment: string;
  leafletCapture: string;
}

export interface MitralRegurgitationData {
  preProcedure: PreProcedureMRData;
  postProcedure: PostProcedureMRData;
  improvement: string;
}

export interface PreProcedureMRData {
  mrGrade: MRSeverityGrade;
  eroa: string;
  regurgitantVolume: string;
  aetiology: 'degenerative' | 'functional' | 'mixed' | 'unknown';
}

export interface PostProcedureMRData {
  mrGrade: MRSeverityGrade;
  regurgitantVolume: string;
  transmitralGradient: string;
}

export interface ClipAssessment {
  deploymentSuccess: 'successful' | 'complicated' | 'unknown';
  clipsDeployed: number;
  leafletCapture: 'satisfactory' | 'adequate' | 'insufficient' | 'unknown';
  positioning: string;
  complications: string[];
}

export interface MTEERComplication {
  type: 'leaflet_tear' | 'chordae_rupture' | 'cardiac_tamponade' | 'residual_shunt' | 'other';
  severity: 'minor' | 'major' | 'life-threatening';
  description: string;
  management?: string;
}

export type ClipType = 
  | 'MitraClip NT'
  | 'MitraClip NTW' 
  | 'MitraClip XTW'
  | 'PASCAL P10'
  | 'PASCAL ACE';

export type MRSeverityGrade = 'mild' | 'moderate' | 'moderate-severe' | 'severe';

// PFO Closure specific types
export interface PFOClosureReport extends MedicalReport {
  pfoClosureData: PFOClosureData;
  pfoAnatomy: PFOAnatomyData;
  deviceAssessment: DeviceAssessment;
  complications: PFOClosureComplication[];
}

export interface PFOClosureData {
  procedureType: 'PFO Closure';
  indication: ClosureIndication;
  clinicalPresentation: string;
  neurologicalWorkup: string;
  imagingFindings: string;
  deviceSelection: string;
  proceduralDetails: PFOProceduralDetails;
  immediateOutcomes: string;
  recommendations: string;
  followUp: string;
}

export interface PFOAnatomyData {
  tunnelLength: string;
  septalThickness: string;
  tunnelDiameter: string;
  atrialSeptalAneurysm: boolean;
  eustachianValve: boolean;
  rimAssessment: string;
  shuntQuantification: string;
}

export interface PFOProceduralDetails {
  iceGuidance: string;
  toeGuidance: string;
  balloonSizing: string;
  deviceDeployment: string;
  closureConfirmation: string;
}

export interface DeviceAssessment {
  deploymentSuccess: 'successful' | 'complicated' | 'unknown';
  deviceType: OccluderType;
  deviceSize: string;
  closureStatus: 'complete' | 'residual_shunt' | 'unknown';
  deviceStability: 'stable' | 'mobile' | 'unknown';
  balloonSizing: string;
  complications: string[];
}

export interface PFOClosureComplication {
  type: 'device_embolization' | 'arrhythmias' | 'air_embolism' | 'perforation' | 'other';
  severity: 'minor' | 'major' | 'life-threatening';
  description: string;
  management?: string;
}

export type OccluderType = 
  | 'Amplatzer PFO Occluder'
  | 'Gore Cardioform'
  | 'Occlutech Figulla'
  | 'Occlutech Figulla Flex';

export type ClosureIndication = 
  | 'cryptogenic_stroke'
  | 'migraine_with_aura'
  | 'decompression_sickness'
  | 'paradoxical_embolism';

// Right Heart Catheterisation specific types
export interface RightHeartCathReport extends MedicalReport {
  rhcData: RightHeartCathData;
  haemodynamicPressures: HaemodynamicPressures;
  cardiacOutput: CardiacOutput;
  exerciseHaemodynamics: ExerciseHaemodynamics | null;
  complications: RHCComplication[];
}

export interface RightHeartCathData {
  procedureType: 'Right Heart Catheterisation';
  indication: RHCIndication;
  clinicalPresentation: string;
  recentInvestigations: string;
  vascularAccess: VenousAccess;
  catheterDetails: string;
  laboratoryValues: RHCLaboratoryValues;
  immediateOutcomes: string;
  recommendations: string;
  followUp: string;
}

export interface HaemodynamicPressures {
  ra: PressureWaveform;
  rv: RVPressures;
  pa: PAPressures;
  pcwp: PressureWaveform;
}

export interface PressureWaveform {
  aWave: string | null;
  vWave: string | null;
  mean: string | null;
}

export interface RVPressures {
  systolic: string | null;
  diastolic: string | null;
  rvedp: string | null;
}

export interface PAPressures {
  systolic: string | null;
  diastolic: string | null;
  mean: string | null;
}

export interface CardiacOutput {
  thermodilution: CardiacOutputMeasurement;
  fick: CardiacOutputMeasurement;
  mixedVenousO2: string | null;
  wedgeSaturation: string | null;
}

export interface CardiacOutputMeasurement {
  co: string | null; // L/min
  ci: string | null; // L/min/m²
}

export interface ExerciseHaemodynamics {
  protocol: string;
  duration: string;
  preExercise: HaemodynamicPressures;
  postExercise: HaemodynamicPressures;
  response: string;
}

export interface RHCLaboratoryValues {
  haemoglobin: string | null;
  lactate: string | null;
}

export interface RHCComplication {
  type: 'arrhythmias' | 'catheter_knotting' | 'tricuspid_regurgitation' | 'pneumothorax' | 'other';
  severity: 'minor' | 'major' | 'life-threatening';
  description: string;
  management?: string;
}

export type VenousAccess = 
  | 'right_basilic'
  | 'right_internal_jugular'
  | 'right_femoral';

export type RHCIndication = 
  | 'heart_failure'
  | 'pulmonary_hypertension'
  | 'transplant_evaluation'
  | 'haemodynamic_assessment'
  | 'cardiomyopathy_evaluation';

// Batch AI Review specific types
export interface PatientAppointment {
  name: string; // Patient name from "Name (ID)" pattern
  dob: string; // Date of birth (may be empty for ID-based pattern)
  fileNumber: string; // Patient ID from parentheses in "Name (ID)" pattern (e.g., "14524")
  appointmentTime: string; // Time slot (e.g., "11:40am")
  appointmentType: string; // Appointment code (e.g., "CaNEW", "CaR20")
  confirmed: boolean;
  isFirstAppointment: boolean;
  notes?: string;
}

export interface BatchAIReviewInput {
  selectedPatients: PatientAppointment[];
  appointmentDate: string;
  calendarUrl: string;
}

export interface PatientReviewResult {
  patient: PatientAppointment;
  reviewReport: any; // Will be BatchPatientReviewReport
  extractedData: {
    background: string;
    investigations: string;
    medications: string;
  };
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface BatchAIReviewReport extends MedicalReport {
  batchData: {
    appointmentDate: string;
    totalPatients: number;
    successfulReviews: number;
    failedReviews: number;
    processingStartTime: number;
    processingEndTime: number;
    patientResults: PatientReviewResult[];
    summary: {
      totalFindings: number;
      immediateFindings: number;
      medicationSafetyIssues: number;
      commonFindings: string[];
    };
    enhancedMetrics?: any;
  };
}

// Batch Patient Review specific types
export interface BatchPatientReviewInput {
  background: string;
  investigations: string;
  medications: string;
}

export interface BatchPatientReviewFinding {
  finding: string;
  australianGuideline: string;
  clinicalReasoning: string;
  recommendedAction: string;
  urgency: 'Immediate' | 'Soon' | 'Routine';
  heartFoundationLink?: string;
}

export interface BatchPatientReviewReport extends MedicalReport {
  reviewData: {
    findings: BatchPatientReviewFinding[];
    guidelineReferences: string[];
    heartFoundationResources: string[];
    cvdRiskCalculatorRecommended: boolean;
    aboriginalTorresStraitIslander: boolean;
    qtProlongationRisk: boolean;
    medicationSafetyIssues: number;
  };
}

// Patient Education specific types
export interface PatientEducationInput {
  patientPriority: 'high' | 'medium' | 'low';
  selectedModules: string[];
  emrData?: {
    demographics?: string;
    background?: string;
    medications?: string;
    investigations?: string;
  };
  patientContext?: string;
}

export interface PatientEducationReport extends MedicalReport {
  educationData: {
    priority: string;
    modules: string[];
    completenessScore?: string;
    australianGuidelines: string[];
    patientResources: string[];
  };
}

export interface PatientEducationModule {
  id: string;
  label: string;
  description: string;
  tooltip: string;
  keywords: string[];
}

export interface PatientEducationConfig {
  modules: PatientEducationModule[];
  priorities: { value: string; label: string; description: string }[];
}

// TAVI Structured JSON Schema with Zod Validation
import { z } from 'zod';

export const TAVIReportSchema = z.object({
  ctAnnulus: z.object({
    area_mm2: z.number().nullable(),
    perimeter_mm: z.number().nullable(),
    min_d_mm: z.number().nullable(),
    max_d_mm: z.number().nullable(),
  }),
  lvot: z.object({
    d1_mm: z.number().nullable().optional(),
    d2_mm: z.number().nullable().optional(),
  }),
  coronaryHeights_mm: z.object({
    left: z.number().nullable(),
    right: z.number().nullable()
  }),
  angles: z.object({
    coplanar_deg: z.number().nullable(),
    doubleCusp_deg: z.number().nullable()
  }),
  device: z.object({
    family: z.string().nullable(),
    model: z.string().nullable(),
    size: z.string().nullable()
  }),
  wire: z.string().nullable(),
  deploymentDepth_mm: z.object({
    NCC: z.number().nullable(),
    LCC: z.number().nullable()
  }),
  predilation: z.object({
    balloon_mm: z.number().nullable()
  }).nullable(),
  postdilationPlan: z.object({
    balloon_mm: z.number().nullable(),
    volume_ml: z.number().nullable()
  }).nullable(),
  recaptures: z.number().nullable(),
  pacing: z.string().nullable(),
  finalHemodynamics: z.object({
    meanGradient_mmHg: z.number().nullable()
  }),
  PVL: z.enum(['none','trace','mild','moderate','severe']).nullable(),
  complications: z.array(z.string()).nullable(),
  nextSteps: z.array(z.string()).nullable(),
  missingFields: z.array(z.string()).default([]),
});

export type TAVIReportData = z.infer<typeof TAVIReportSchema>;

// Enhanced TAVI Report interface with structured JSON data
export interface TAVIReportStructured extends MedicalReport {
  taviData?: any;
  taviJsonData?: TAVIReportData;
  hemodynamics?: any;
  valveAssessment?: any;
  complications?: any[];
  validationErrors?: string[];
  isValidJson: boolean;
}

// TAVI Measurement Interface Types
export interface TAVIMeasurementData {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  view: string; // e.g., "Post-deployment + 3-cusp view"
  measurements: TAVIMeasurement[];
  completed: boolean;
  timestamp: number;
}

export interface TAVIMeasurement {
  id: string;
  type: 'height' | 'diameter' | 'area' | 'perimeter';
  label: string; // e.g., "H-L", "H-R"
  value: number; // in mm or mm²
  expectedValue?: number; // for percentage calculation
  percentage?: number; // calculated percentage of expected
  coordinates?: MeasurementCoordinates;
}

export interface MeasurementCoordinates {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface TAVIMeasurementSession {
  sessionId: string;
  patientId?: string;
  measurements: TAVIMeasurementData[];
  valveType: ValveTypeOption;
  nativeAnnulus: {
    perimeter: number;
    area: number;
  };
  additionalBalloonVolume: number;
  averagePostDeploymentExpansion: {
    mm: number;
    percentage: number;
  };
  completionStatus: MeasurementCompletionStatus;
  createdAt: number;
  updatedAt: number;
}

export interface MeasurementCompletionStatus {
  [measurementId: string]: {
    completed: boolean;
    percentage: number;
  };
}

export type ValveTypeOption = 'Edwards Sapien' | 'Medtronic Evolut' | 'Abbott Navitor';

export interface TAVIMeasurementConfig {
  expectedValues: {
    [valveType in ValveTypeOption]: {
      [size in ValveSize]: {
        height: number;
        diameter: number;
      };
    };
  };
  balloonVolumeOptions: number[];
}
