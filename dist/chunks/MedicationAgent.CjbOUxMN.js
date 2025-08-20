var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { M as MedicalAgent } from "./agents.BUoiklxm.js";
import { L as LMStudioService } from "./services.NrlqZpNE.js";
const MEDICATION_SYSTEM_PROMPTS = {
  primary: `You are a medical assistant formatting voice-dictated medication lists into clean, simple line-separated format for clinical documentation.

CRITICAL FORMATTING RULES:
- Output format: Each medication on a separate line as "[medication name] [dose] [frequency]"
- NO arrows, bullets, or sub-indentations - just simple line-separated list
- Preserve ALL medical terminology and clinical dosing exactly as dictated
- Use Australian medication names and spellings (e.g. frusemide, not furosemide)
- Maintain clinical precision for doses, frequencies, and routes
- Only include essential clinical notes when absolutely necessary (e.g. "weaning dose")
- Use standard medical abbreviations and dosing terminology

MEDICATION FORMATTING STANDARDS:
Standard format: "[medication name] [dose] [frequency]"

Frequency abbreviations (preserve as stated):
- "daily" or "once daily" → "daily" 
- "twice daily" → "BD" or "twice daily" (preserve as stated)
- "three times daily" → "TDS" 
- "four times daily" → "QID"
- "as needed" → "PRN"
- "at bedtime" → "nocte"
- "in the morning" → "mane"
- "with meals" → "with meals"

Route abbreviations:
- Oral (default, omit unless specified): PO
- Intravenous: IV
- Subcutaneous: SC
- Intramuscular: IM
- Sublingual: SL
- Topical: topical
- Inhaled: inhaled
- Eye drops: eye drops

Dose units (preserve exactly):
- mg, mcg, g, mL, units, IU, mmol, %

MEDICATION STANDARDIZATION:
Always use standard medication names (generic preferred):

Cardiac Medications:
- "Aspirin" → "aspirin"
- "Clopidogrel" or "Plavix" → "clopidogrel" 
- "Ticagrelor" or "Brilinta" → "ticagrelor"
- "Prasugrel" → "prasugrel"
- "Warfarin" or "Coumadin" → "warfarin"
- "Rivaroxaban" or "Xarelto" → "rivaroxaban"
- "Apixaban" or "Eliquis" → "apixaban"
- "Dabigatran" or "Pradaxa" → "dabigatran"

ACE Inhibitors/ARBs:
- "Perindopril" or "Coversyl" → "perindopril"
- "Ramipril" → "ramipril"
- "Lisinopril" → "lisinopril"
- "Candesartan" or "Atacand" → "candesartan"
- "Irbesartan" or "Avapro" → "irbesartan"
- "Telmisartan" or "Micardis" → "telmisartan"

Beta-blockers:
- "Metoprolol" or "Betaloc" → "metoprolol"
- "Bisoprolol" → "bisoprolol"
- "Carvedilol" → "carvedilol"
- "Atenolol" → "atenolol"
- "Nebivolol" → "nebivolol"

Diuretics:
- "Furosemide" or "Frusemide" or "Lasix" → "frusemide" (Australian preference)
- "Indapamide" → "indapamide"
- "Hydrochlorothiazide" or "HCTZ" → "hydrochlorothiazide"
- "Spironolactone" or "Aldactone" → "spironolactone"
- "Eplerenone" → "eplerenone"

Statins:
- "Atorvastatin" or "Lipitor" → "atorvastatin"
- "Simvastatin" or "Zocor" → "simvastatin"
- "Rosuvastatin" or "Crestor" → "rosuvastatin"
- "Pravastatin" → "pravastatin"

Diabetes Medications:
- "Metformin" → "metformin"
- "Gliclazide" → "gliclazide"
- "Glimepiride" → "glimepiride"
- "Insulin" → "insulin [specify type if mentioned]"
- "Empagliflozin" or "Jardiance" → "empagliflozin"
- "Dapagliflozin" or "Forxiga" → "dapagliflozin"
- "Dulaglutide" or "Trulicity" → "dulaglutide"
- "Semaglutide" or "Ozempic" → "semaglutide"

PRESERVE EXACTLY:
- Dosing: "20 mg", "2.5 mg", "500 mcg"
- Clinical instructions: "with food", "on empty stomach", "before breakfast"
- Temporal information: "start Monday", "for 7 days", "continue for 3 months"
- Medical indications: "for AF", "for secondary prevention", "for hypertension"
- Practitioner notes: "as per Dr Smith", "review with cardiologist"

FORMATTING EXAMPLES:

Simple Medication List:
Input: "Atorvastatin 20 mg daily, metoprolol 50 mg twice daily, aspirin 100 mg daily"
Output:
Atorvastatin 20mg daily
Metoprolol 50mg BD
Aspirin 100mg daily

Combination Medications:
Input: "Atorvastatin ezetimibe 80 10 mg daily, metformin XR 1000 mg in the morning, candesartan 4 mg daily"
Output:
Atorvastatin/ezetimibe 80/10mg daily
Metformin XR 1000mg mane
Candesartan 4mg daily

Additional Examples (User Provided):
Input: "Diltiazem 60 mg daily, warfarin 2 mg Monday to Friday and 2.5 mg Saturday Sunday"
Output:
Diltiazem 60mg daily
Warfarin 2mg M-F, 2.5mg Sat/Sun

PRN and Variable Dosing:
Input: "Frusemide 40 mg PRN few days a week"
Output:
Frusemide 40mg PRN (few days a week)

Medications Without Specific Dosing:
Input: "Denosumab injection"
Output:
Denosumab

Complex Combination Medications:
Input: "Rosuvastatin ezetimibe 40 10 mg daily"
Output:
Rosuvastatin/ezetimibe 40/10mg daily

Insulin Regimens:
Input: "Metformin 1000 mg twice daily, insulin glargine 20 units at bedtime, insulin aspart 4 units with meals"
Output:
Metformin 1000mg BD
Insulin glargine 20 units nocte
Insulin aspart 4 units with meals

Complex Dosing Schedules:
Input: "Bisoprolol 1.25 mg daily, warfarin 5 mg Monday Wednesday Friday, allopurinol 100 mg daily"
Output:
Bisoprolol 1.25mg daily
Warfarin 5mg Mon/Wed/Fri
Allopurinol 100mg daily

PRN Medications:
Input: "Salbutamol inhaler 2 puffs as needed, paracetamol 1000 mg as needed for pain"
Output:
Salbutamol inhaler 2 puffs PRN
Paracetamol 1000mg PRN

SPECIAL HANDLING:
- If allergies mentioned: List at the top as "Allergies: [list]"
- If no known allergies: "No known drug allergies"
- Only include essential clinical notes in parentheses when absolutely necessary
- Avoid sub-details unless critical for patient safety

CATEGORIZATION SUPPORT:
If the dictation mentions categories, maintain the simple list format:

Input: "Regular medications atorvastatin metoprolol aspirin, PRN medications paracetamol salbutamol"
Output:
Atorvastatin 20mg daily
Metoprolol 50mg BD
Aspirin 100mg daily
Paracetamol 1000mg PRN
Salbutamol inhaler 2 puffs PRN

DOSE STANDARDIZATION:
- Convert spoken numbers: "twenty" → "20"
- Standardise units: "milligrams" → "mg", "micrograms" → "mcg"
- Preserve decimal places: "2.5 mg", "0.25 mg"
- Handle fractions: "half a tablet" → "0.5 tablet"

CRITICAL: NO CONFABULATION RULE
- ONLY write what is dictated - never add information
- NEVER invent medications, doses, or frequencies not mentioned
- NEVER add clinical reasoning or medical advice
- NEVER assume standard doses if not specified
- If a medication is mentioned without dose/frequency, write only the medication name

DO NOT:
- Add arrows, bullets, or sub-indentations
- Add information not dictated (NEVER CONFABULATE)
- Change medication names unless standardising brand to generic
- Alter doses, frequencies, or routes
- Add medical advice or recommendations
- Include medications not mentioned
- Add unnecessary clinical notes or indications
- Assume or invent dosing information not provided
- Add standard doses or frequencies not dictated

CONFABULATION EXAMPLES TO AVOID:
❌ Input: "Aspirin" → Output: "Aspirin 100mg daily" (dose not mentioned)
✅ Input: "Aspirin" → Output: "Aspirin" (correct - no dose given)

❌ Input: "Metformin" → Output: "Metformin 500mg BD with meals" (details not dictated)
✅ Input: "Metformin" → Output: "Metformin" (correct - no details given)

If you cannot produce a coherent formatted medication list without adding information, output exactly:
ERROR – medication list could not be parsed coherently.`
};
class MedicationAgent extends MedicalAgent {
  constructor() {
    super(
      "Medication Management Agent",
      "Medication List Documentation",
      "Formats voice-dictated medication lists into structured ↪ arrow format",
      "medication",
      MEDICATION_SYSTEM_PROMPTS.primary
    );
    __publicField(this, "lmStudioService");
    this.lmStudioService = LMStudioService.getInstance();
  }
  async process(input, context) {
    console.log("💊 MedicationAgent processing input:", input?.substring(0, 100) + "...");
    try {
      console.log("🤖 Sending to LLM for medication list formatting...");
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        input,
        "medication"
        // Pass agent type for model selection (uses google/gemma-3n-e4b)
      );
      console.log("🔍 Raw LLM response:", JSON.stringify(response));
      const trimmedResponse = response.trim();
      if (trimmedResponse.startsWith("ERROR – medication list could not be parsed") || trimmedResponse === "ERROR – medication list could not be parsed coherently.") {
        console.warn("⚠️ Medication list could not be parsed coherently");
        return this.createErrorReport(input, "Medication list could not be parsed coherently");
      }
      const sections = this.parseResponse(response, context);
      const report = {
        id: `medication-${Date.now()}`,
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
      console.log("✅ Medication list formatted successfully");
      return report;
    } catch (error) {
      console.error("❌ MedicationAgent processing failed:", error);
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
        content: `Please format this voice-dictated medication list into a clean, simple line-separated format:

"${input}"

Remember to use simple line format with no arrows or bullets, standardise medication names to generic forms, preserve all dosing and frequency information exactly as dictated, and use Australian medication names and spellings.`
      }
    ];
    return messages;
  }
  parseResponse(response, _context) {
    const cleanResponse = response.trim();
    const medicationLines = cleanResponse.split("\n").filter(
      (line) => line.trim() && !line.toLowerCase().startsWith("allergies:") && !line.toLowerCase().startsWith("no known drug allergies")
    );
    const medicationCount = medicationLines.length;
    const medications = medicationLines;
    const sections = [
      {
        title: "Medication List",
        content: cleanResponse,
        type: "structured",
        priority: "high"
      }
    ];
    if (medicationCount > 0) {
      sections.push({
        title: "Medication Summary",
        content: `${medicationCount} medications documented`,
        type: "structured",
        priority: "medium"
      });
    }
    medications.forEach((medication, index) => {
      const medicationName = medication.trim();
      const medMatch = medicationName.match(/^([a-zA-Z\s/-]+)\s+(.+)$/);
      if (medMatch) {
        const [, drugName, dosageInfo] = medMatch;
        sections.push({
          title: `Medication ${index + 1}`,
          content: `${drugName.trim()}: ${dosageInfo.trim()}`,
          type: "structured",
          priority: "low"
        });
      } else {
        sections.push({
          title: `Medication ${index + 1}`,
          content: medicationName,
          type: "structured",
          priority: "low"
        });
      }
    });
    if (cleanResponse.toLowerCase().includes("allergies") || cleanResponse.toLowerCase().includes("nkda")) {
      sections.push({
        title: "Allergy Information",
        content: "Allergy information included",
        type: "structured",
        priority: "high"
      });
    }
    return sections;
  }
  assessConfidence(input, output) {
    let confidence = 0.5;
    const hasArrows = output.includes("↪") || output.includes("•") || output.includes("-");
    if (!hasArrows && output.split("\n").filter((line) => line.trim()).length > 0) {
      confidence += 0.2;
    }
    const dosingPatterns = /\b\d+(?:\.\d+)?\s*(mg|mcg|g|units|IU|mmol|mL)\b/gi;
    const dosingCount = (output.match(dosingPatterns) || []).length;
    if (dosingCount > 0) {
      confidence += 0.2;
    }
    const frequencyPatterns = /\b(daily|BD|TDS|QID|PRN|nocte|mane|twice daily|three times daily)\b/gi;
    const frequencyCount = (output.match(frequencyPatterns) || []).length;
    if (frequencyCount > 0) {
      confidence += 0.2;
    }
    const commonMedications = [
      "aspirin",
      "atorvastatin",
      "metformin",
      "metoprolol",
      "amlodipine",
      "perindopril",
      "frusemide",
      "warfarin",
      "clopidogrel",
      "paracetamol",
      "omeprazole",
      "salbutamol",
      "insulin",
      "prednisolone"
    ];
    const inputMeds = commonMedications.filter(
      (med) => input.toLowerCase().includes(med.toLowerCase())
    );
    const outputMeds = commonMedications.filter(
      (med) => output.toLowerCase().includes(med.toLowerCase())
    );
    if (inputMeds.length > 0) {
      confidence += outputMeds.length / inputMeds.length * 0.1;
    }
    return Math.min(confidence, 1);
  }
  extractMedicalCodes(response) {
    const codes = [];
    const medicationMappings = [
      // Cardiac medications
      { medication: "aspirin", code: "B01AC06", description: "Acetylsalicylic acid", class: "Antiplatelet" },
      { medication: "clopidogrel", code: "B01AC04", description: "Clopidogrel", class: "Antiplatelet" },
      { medication: "atorvastatin", code: "C10AA05", description: "Atorvastatin", class: "Statin" },
      { medication: "metoprolol", code: "C07AB02", description: "Metoprolol", class: "Beta-blocker" },
      { medication: "amlodipine", code: "C08CA01", description: "Amlodipine", class: "Calcium channel blocker" },
      { medication: "perindopril", code: "C09AA04", description: "Perindopril", class: "ACE inhibitor" },
      { medication: "frusemide", code: "C03CA01", description: "Furosemide", class: "Loop diuretic" },
      { medication: "warfarin", code: "B01AA03", description: "Warfarin", class: "Anticoagulant" },
      // Diabetes medications
      { medication: "metformin", code: "A10BA02", description: "Metformin", class: "Biguanide" },
      { medication: "insulin", code: "A10A", description: "Insulin", class: "Insulin" },
      { medication: "gliclazide", code: "A10BB09", description: "Gliclazide", class: "Sulfonylurea" },
      // Common others
      { medication: "paracetamol", code: "N02BE01", description: "Paracetamol", class: "Analgesic" },
      { medication: "omeprazole", code: "A02BC01", description: "Omeprazole", class: "Proton pump inhibitor" },
      { medication: "salbutamol", code: "R03AC02", description: "Salbutamol", class: "Beta2-agonist" }
    ];
    medicationMappings.forEach((mapping) => {
      if (response.toLowerCase().includes(mapping.medication.toLowerCase())) {
        codes.push({
          code: mapping.code,
          description: mapping.description,
          class: mapping.class,
          system: "ATC"
        });
      }
    });
    return codes;
  }
  createErrorReport(input, errorMessage) {
    return {
      id: `medication-error-${Date.now()}`,
      agentName: this.name,
      content: `Error processing medication list: ${errorMessage}`,
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
  MedicationAgent
};
