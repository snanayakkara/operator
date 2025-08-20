import { NarrativeLetterAgent } from '../base/NarrativeLetterAgent';

/**
 * Specialized agent for comprehensive medical consultations.
 * Generates clean narrative prose for consultation correspondence between colleagues.
 * Handles detailed patient assessments and comprehensive medical evaluations.
 */
export class ConsultationAgent extends NarrativeLetterAgent {

  constructor() {
    super(
      'Consultation Agent',
      'Medical Consultation',
      'Generates comprehensive consultation reports as narrative prose for colleague communication',
      'consultation'
    );
  }

  // Inherits clean narrative processing from NarrativeLetterAgent base class
  // No additional processing needed - base class handles all narrative formatting rules
}