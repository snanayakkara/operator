var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { M as MedicalAgent } from "./agents.BUoiklxm.js";
import { L as LMStudioService } from "./services.NrlqZpNE.js";
const BACKGROUND_SYSTEM_PROMPTS = {
  primary: `You are a medical assistant formatting voice-dictated patient medical background/history into structured lists using ↪ arrow notation for clinical documentation.

CRITICAL FORMATTING RULES:
- Output format: Each condition starts with ↪ followed by the condition name
- Sub-conditions or details are indented with "- " under the main condition
- Preserve ALL medical terminology and clinical values exactly as dictated
- Use Australian medical spelling (e.g., oesophageal, anaemia, oedema, haematology)
- Maintain clinical precision for dates, measurements, and technical details
- Separate distinct conditions with line breaks (new ↪ arrow for each major condition)
- Use standard medical abbreviations: AF, HTN, DM, CAD, COPD, CKD, etc.
- Preserve exact medical terminology as stated by clinician

MEDICAL CONDITION STANDARDIZATION:
Always use standard medical terminology:

Cardiovascular Conditions:
- "Atrial fibrillation" → "Atrial fibrillation" (specify paroxysmal/persistent/permanent if mentioned)
- "High blood pressure" → "Hypertension" 
- "Heart failure" → "Heart failure" (specify HFrEF/HFpEF if mentioned)
- "Coronary artery disease" → "Coronary artery disease"
- "Heart attack" → "Myocardial infarction"
- "Valve disease" → Use specific valve (e.g., "Aortic stenosis", "Mitral regurgitation")

Metabolic/Endocrine:
- "Diabetes" → "Type 2 diabetes mellitus" (or "Type 1" if specified)
- "Pre-diabetes" → "Pre-diabetes"
- "High cholesterol" → "Hyperlipidaemia"
- "Thyroid problems" → "Hypothyroidism" or "Hyperthyroidism" (if specified)

Respiratory:
- "Asthma" → "Asthma"
- "COPD" → "Chronic obstructive pulmonary disease"
- "Sleep apnea" → "Obstructive sleep apnoea"

Renal/Other:
- "Kidney disease" → "Chronic kidney disease"
- "Stroke" → "Cerebrovascular accident" or "Ischaemic stroke" (if type specified)
- "Cancer" → Use specific type if mentioned, otherwise "Malignancy"

PRESERVE EXACTLY:
- Dates: "TOE guided cardioversion on 21 Feb 2025"
- Medical procedures: "Medtronic Azure XT dual chamber pacemaker"
- Specific medications: "sees Dr Virginia Knight"
- Clinical values: "HbA1c 6.8%"
- Institutional details: "(Sugumar, Cabrini)"
- Temporal information: "presented with complete heart block and syncope in Dec 2024"

FORMATTING EXAMPLES:

Simple Conditions List:
Input: "Paroxysmal atrial fibrillation, hypertension, current smoker, family history of premature coronary artery disease"
Output:
↪ Paroxysmal atrial fibrillation
↪ Hypertension
↪ Current smoker
↪ Family history of premature coronary artery disease

Complex Conditions with Sub-details:
Input: "Paroxysmal atrial fibrillation had TOE guided cardioversion on 21st February 2025, hypertension, current smoker, family history of premature coronary artery disease"
Output:
↪ Paroxysmal atrial fibrillation
- TOE guided cardioversion on 21 Feb 2025
↪ Hypertension
↪ Current smoker
↪ Family history of premature coronary artery disease

Complex Medical History with Multiple Sub-conditions:
Input: "Moderate aortic stenosis, permanent pacemaker Medtronic Azure XT dual chamber implanted by Sugumar at Cabrini presented with complete heart block and syncope in December 2024, chronic kidney disease, autoimmune hepatitis sees Doctor Virginia Knight, steroid induced hyperglycaemia HbA1c six point eight percent, hypertension, osteoarthritis"
Output:
↪ Moderate aortic stenosis
↪ Permanent pacemaker (Medtronic Azure XT dual chamber, Sugumar, Cabrini)
- presented with complete heart block and syncope in Dec 2024
↪ Chronic kidney disease
↪ Autoimmune hepatitis
- sees Dr Virginia Knight
↪ Steroid induced hyperglycaemia
- HbA1c 6.8%
↪ Hypertension
↪ Osteoarthritis

Aneurysm and Multiple Conditions:
Input: "Ascending aortic aneurysm, hypertension, hyperlipidaemia, pre-diabetes, asthma"
Output:
↪ Ascending aortic aneurysm
↪ Hypertension
↪ Hyperlipidaemia
↪ Pre-diabetes
↪ Asthma

CATEGORIZATION SUPPORT:
If the dictation mentions categories, organize accordingly:

Input: "Past medical history paroxysmal AF, hypertension. Medications aspirin, metoprolol. Social history current smoker, family history premature CAD."
Output:
↪ Paroxysmal atrial fibrillation
↪ Hypertension
↪ Current smoker
↪ Family history of premature coronary artery disease

MEDICATION FORMATTING:
When medications are part of background history:
Input: "Hypertension on amlodipine and metoprolol, diabetes on metformin"
Output:
↪ Hypertension
- on amlodipine and metoprolol
↪ Type 2 diabetes mellitus
- on metformin

DATE STANDARDIZATION:
- Convert to standard format: "21 Feb 2025" not "21st February 2025"
- Month ranges: "Dec 2024" for specific months
- Use abbreviated months: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec

DO NOT:
- Add information not dictated
- Change medical terminology or clinical values
- Alter practitioner names or institutions
- Add explanatory text or commentary
- Include duplicate conditions
- Change the order of conditions unless grouping by category is explicitly requested

SPECIAL HANDLING:
- If allergies mentioned: Use "↪ Allergies: [list]" format
- If family history: Use "↪ Family history of [condition]"
- If social history: Use "↪ Current smoker", "↪ Ex-smoker", etc.
- If surgical history: Use "↪ [Procedure] ([date])" format

If you cannot produce a coherent formatted medical history without adding information, output exactly:
ERROR – medical background could not be parsed coherently.`
};
class BackgroundAgent extends MedicalAgent {
  constructor() {
    super(
      "Background Medical History Agent",
      "Medical Background Documentation",
      "Formats voice-dictated medical background/history into structured ↪ arrow format",
      "background",
      BACKGROUND_SYSTEM_PROMPTS.primary
    );
    __publicField(this, "lmStudioService");
    this.lmStudioService = LMStudioService.getInstance();
  }
  async process(input, context) {
    console.log("🏥 BackgroundAgent processing input:", input?.substring(0, 100) + "...");
    try {
      console.log("🤖 Sending to LLM for medical background formatting...");
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        input,
        "background"
        // Pass agent type for model selection (uses google/gemma-3n-e4b)
      );
      console.log("🔍 Raw LLM response:", JSON.stringify(response));
      const trimmedResponse = response.trim();
      if (trimmedResponse.startsWith("ERROR – medical background could not be parsed") || trimmedResponse === "ERROR – medical background could not be parsed coherently.") {
        console.warn("⚠️ Medical background could not be parsed coherently");
        return this.createErrorReport(input, "Medical background could not be parsed coherently");
      }
      const sections = this.parseResponse(response, context);
      const report = {
        id: `background-${Date.now()}`,
        agentName: this.name,
        content: response.trim(),
        sections,
        metadata: {
          confidence: this.assessConfidence(input, response),
          processingTime: Date.now() - (context?.timestamp || Date.now()),
          medicalCodes: this.extractMedicalCodes(response),
          modelUsed: "google/gemma-3n-e4b"
        },
        timestamp: Date.now()
      };
      console.log("✅ Medical background formatted successfully");
      return report;
    } catch (error) {
      console.error("❌ BackgroundAgent processing failed:", error);
      return this.createErrorReport(input, error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
  buildMessages(input, _context) {
    const messages = [
      {
        role: "system",
        content: this.systemPrompt
      },
      {
        role: "user",
        content: `Please format this voice-dictated medical background/history into structured ↪ arrow format:

"${input}"

Remember to use ↪ for each major condition and - for sub-details, preserve all medical terminology exactly as dictated, and use Australian medical spelling.`
      }
    ];
    return messages;
  }
  parseResponse(response, _context) {
    const cleanResponse = response.trim();
    const conditionCount = (cleanResponse.match(/↪/g) || []).length;
    const conditions = cleanResponse.split("\n").filter((line) => line.startsWith("↪"));
    const sections = [
      {
        title: "Medical Background",
        content: cleanResponse,
        type: "structured",
        priority: "high"
      }
    ];
    if (conditionCount > 0) {
      sections.push({
        title: "Condition Summary",
        content: `${conditionCount} medical conditions documented`,
        type: "structured",
        priority: "medium"
      });
    }
    conditions.forEach((condition, index) => {
      const conditionName = condition.replace("↪ ", "").trim();
      sections.push({
        title: `Condition ${index + 1}`,
        content: conditionName,
        type: "structured",
        priority: "low"
      });
    });
    return sections;
  }
  assessConfidence(input, output) {
    let confidence = 0.5;
    const arrowCount = (output.match(/↪/g) || []).length;
    if (arrowCount > 0) {
      confidence += 0.3;
    }
    const medicalTerms = [
      "hypertension",
      "diabetes",
      "atrial fibrillation",
      "coronary",
      "heart failure",
      "asthma",
      "COPD",
      "kidney",
      "stroke",
      "cancer",
      "AF",
      "HTN",
      "DM",
      "CAD"
    ];
    const inputTerms = medicalTerms.filter(
      (term) => input.toLowerCase().includes(term.toLowerCase())
    );
    const outputTerms = medicalTerms.filter(
      (term) => output.toLowerCase().includes(term.toLowerCase())
    );
    if (inputTerms.length > 0) {
      confidence += outputTerms.length / inputTerms.length * 0.2;
    }
    return Math.min(confidence, 1);
  }
  extractMedicalCodes(response) {
    const codes = [];
    const conditionMappings = [
      { condition: "hypertension", code: "I10", description: "Essential hypertension" },
      { condition: "diabetes", code: "E11", description: "Type 2 diabetes mellitus" },
      { condition: "atrial fibrillation", code: "I48", description: "Atrial fibrillation" },
      { condition: "coronary artery disease", code: "I25", description: "Chronic ischaemic heart disease" },
      { condition: "heart failure", code: "I50", description: "Heart failure" },
      { condition: "asthma", code: "J45", description: "Asthma" },
      { condition: "chronic kidney disease", code: "N18", description: "Chronic kidney disease" },
      { condition: "aortic stenosis", code: "I35.0", description: "Nonrheumatic aortic stenosis" }
    ];
    conditionMappings.forEach((mapping) => {
      if (response.toLowerCase().includes(mapping.condition.toLowerCase())) {
        codes.push({
          code: mapping.code,
          description: mapping.description,
          system: "ICD-10"
        });
      }
    });
    return codes;
  }
  createErrorReport(input, errorMessage) {
    return {
      id: `background-error-${Date.now()}`,
      agentName: this.name,
      content: `Error processing medical background: ${errorMessage}`,
      sections: [
        {
          title: "Processing Error",
          content: errorMessage,
          type: "narrative",
          priority: "high"
        },
        {
          title: "Original Input",
          content: input,
          type: "narrative",
          priority: "medium"
        }
      ],
      metadata: {
        confidence: 0,
        processingTime: 0,
        medicalCodes: [],
        modelUsed: "google/gemma-3n-e4b"
      },
      timestamp: Date.now(),
      errors: [errorMessage]
    };
  }
}
export {
  BackgroundAgent
};
