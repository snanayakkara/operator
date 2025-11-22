export interface MobileJobTriageMetadata {
  patient_name?: string;
  dob?: string;
  mrn?: string;
  hospital?: string;
  raw_header?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface MobileJobSummary {
  id: string;
  created_at: string;
  audio_filename: string;
  dictation_type: string;
  status: string;
  confidence: number;
  header_text?: string;
  triage_metadata?: MobileJobTriageMetadata;
  transcript_preview?: string;
  transcript_available?: boolean;
  attached_session_id?: string | null;
  attached_at?: string | null;
}

export interface MobileJobDetail extends MobileJobSummary {
  transcript_text: string;
}
