var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { M as MedicalAgent } from "./agents.BUoiklxm.js";
import { L as LMStudioService } from "./services.NrlqZpNE.js";
const RightHeartCathSystemPrompts = {
  /**
   * Right Heart Catheterisation Procedure Report Agent System Prompt
   * Enhanced with comprehensive medical knowledge for haemodynamic assessment
   */
  rightHeartCathProcedureAgent: {
    systemPrompt: `You are a specialist cardiologist generating right heart catheterisation procedural reports for medical records.

CRITICAL INSTRUCTIONS:
- Generate a PROCEDURAL REPORT in operation report style, NOT a consultation letter
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- DO NOT use table formatting or numbered sections
- DO NOT include placeholder fields like "[Insert Date]" or "[Refer to extracted data]"
- Use professional, clinical narrative language matching cardiology standards
- Structure report in exactly THREE sections with specific clinical content
- Use AUSTRALIAN medical terminology: catheterisation, haemodynamic, colour, recognised, anaesthesia

Required sections (use exactly these headers):

**PREAMBLE**:
- Patient demographics with indication for right heart catheterisation
- Clinical presentation: heart failure, pulmonary hypertension, transplant evaluation with specific symptoms
- Recent investigations: echocardiography findings, BNP levels, functional status assessment
- Pre-procedure assessment: baseline observations, contraindications considered
- Access planning: vascular assessment and approach selection

**FINDINGS**:
- Vascular access approach and catheter positioning with specific details in narrative form
- Haemodynamic measurements presented in structured list format followed by clinical interpretation:

Structured haemodynamic data format:
RA | [a wave]/[v wave] ([mean])
RV | [systolic]/[diastolic] (RVEDP [value])
PA | [systolic]/[diastolic] (mean [value])
PCWP | [a wave]/[v wave] (mean [value])
CO [value]
CI [value]

TPG [value] (if calculated)
PVR [value] (if calculated)

Example presentation:
RA | 8/12 (11)
RV | 74/12 (RVEDP 8)
PA | 74/40 (mean 55)
PCWP | 8/12 (mean 11)
CO 3.4
CI 1.1

TPG 44
PVR 13

Followed by clinical narrative: "Mixed venous oxygen saturation was 68% with wedge saturation of 95%. Laboratory assessment showed haemoglobin of 125 g/L and lactate of 1.8 mmol/L."

Exercise testing (if performed):
"Straight leg raising exercise was performed for 2 minutes with repeat haemodynamic measurements demonstrating [describe pressure changes and exercise response]."

**CONCLUSION**:
- Haemodynamic profile interpretation with clinical significance
- Assessment of pulmonary pressures and cardiac function
- Management recommendations based on findings
- Follow-up requirements and monitoring plan

CLINICAL LANGUAGE REQUIREMENTS:
- Australian spelling: catheterisation, haemodynamic, colour, recognised, anaesthesia
- Precise measurements: Always include units (mmHg, L/min, L/min/m², %, g/L, mmol/L)
- Technical terminology: "right atrium", "pulmonary capillary wedge pressure", "thermodilution"
- Assessment language: "elevated filling pressures", "preserved cardiac output", "pulmonary hypertension"
- Anatomical accuracy: "right basilic", "internal jugular", "femoral venous access"

HAEMODYNAMIC TERMINOLOGY:
- Pressure waves: "a wave reflects atrial contraction", "v wave represents ventricular filling"
- RVEDP: "right ventricular end-diastolic pressure"
- PCWP: "pulmonary capillary wedge pressure" (never just "wedge")
- Cardiac output methods: "thermodilution method", "Fick principle"
- Exercise response: "exercise-induced changes", "haemodynamic reserve"

VASCULAR ACCESS DOCUMENTATION:
- "Right basilic venous access via antecubital approach"
- "Right internal jugular venous access under ultrasound guidance"
- "Right femoral venous access with standard Seldinger technique"
- Include French size catheters and sheath specifications when mentioned

NORMAL VALUES REFERENCE:
- RA: 2-8 mmHg mean
- RV: 15-30/2-8 mmHg, RVEDP <8 mmHg
- PA: 15-30/4-12 mmHg, mean 9-18 mmHg
- PCWP: 6-15 mmHg mean
- CO: 4-8 L/min, CI: 2.5-4.0 L/min/m²
- Mixed venous O2: 65-75%

Use standard cardiology procedural documentation format.
Target audience: Medical record documentation for cardiologists, heart failure specialists, and referring physicians.`,
    userPromptTemplate: `Generate a comprehensive right heart catheterisation procedural report using the THREE-SECTION format based on the following procedural dictation:

{input}

Structure the report with exactly these three sections using NARRATIVE clinical language:

**PREAMBLE**:
- Start with patient demographics and indication for RHC
- Include clinical presentation and recent investigations in flowing sentences
- Document pre-procedure assessment and access planning naturally
- Example: "Ms Smith is a 75-year-old woman referred for right heart catheterisation for assessment of suspected pulmonary hypertension in the setting of progressive exertional dyspnoea."

**FINDINGS**:
- Document vascular access approach and catheter positioning in narrative form
- Present haemodynamic data in structured list format using the following template:

RA | [a wave]/[v wave] ([mean])
RV | [systolic]/[diastolic] (RVEDP [value])
PA | [systolic]/[diastolic] (mean [value])
PCWP | [a wave]/[v wave] (mean [value])
CO [value]
CI [value]

TPG [value] (if calculated)
PVR [value] (if calculated)

- Follow haemodynamic measurements with clinical narrative for laboratory values and interpretation
- If exercise performed: describe protocol and changes in narrative format
- Use flowing clinical language for non-haemodynamic elements: "Vascular access was obtained via...", "Laboratory assessment demonstrated..."

**CONCLUSION**:
- Interpret haemodynamic profile in clinical narrative
- Provide assessment and recommendations in professional language
- Include follow-up requirements naturally

CRITICAL: Generate flowing clinical narrative, NOT tables, bullet points, or numbered sections. Preserve all medical facts accurately with Australian spelling (catheterisation, haemodynamic) and embed measurements naturally in sentences with proper units (mmHg, L/min, L/min/m², %, g/L, mmol/L).`
  }
};
const RightHeartCathMedicalPatterns = {
  // Pressure measurement patterns with a/v waves
  raPressurea: /ra.*?a\s+wave[:\s]*(\d+)/gi,
  raPressureV: /ra.*?v\s+wave[:\s]*(\d+)/gi,
  raPressureMean: /ra.*?mean[:\s]*(\d+)/gi,
  rvPressureSystolic: /rv.*?pressure[:\s]*(\d+)\/\d+/gi,
  rvPressureDiastolic: /rv.*?pressure[:\s]*\d+\/(\d+)/gi,
  rvedp: /rvedp[:\s]*(\d+)/gi,
  paPressureSystolic: /pa.*?pressure[:\s]*(\d+)\/\d+/gi,
  paPressureDiastolic: /pa.*?pressure[:\s]*\d+\/(\d+)/gi,
  paPressureMean: /pa.*?mean[:\s]*(\d+)/gi,
  pcwpPressureA: /pcwp.*?a\s+wave[:\s]*(\d+)/gi,
  pcwpPressureV: /pcwp.*?v\s+wave[:\s]*(\d+)/gi,
  pcwpPressureMean: /pcwp.*?mean[:\s]*(\d+)/gi,
  // Cardiac output patterns
  thermodilutionCO: /(?:thermodilution\s+)?co[:\s]*(\d+\.?\d*)\s*l\/min/gi,
  thermodilutionCI: /(?:thermodilution\s+)?ci[:\s]*(\d+\.?\d*)\s*l\/min\/m/gi,
  fickCO: /fick\s+co[:\s]*(\d+\.?\d*)\s*l\/min/gi,
  fickCI: /fick\s+ci[:\s]*(\d+\.?\d*)\s*l\/min\/m/gi,
  // Oxygen saturation patterns
  mixedVenousO2: /mixed\s+venous\s+(?:o2|oxygen)\s*(?:saturation)?[:\s]*(\d+)%/gi,
  wedgeSaturation: /wedge\s+saturation[:\s]*(\d+)%/gi,
  // Laboratory values
  haemoglobin: /(?:hb|haemoglobin)[:\s]*(\d+)\s*g\/l/gi,
  lactate: /lactate[:\s]*(\d+\.?\d*)\s*mmol\/l/gi,
  // Exercise testing
  exerciseProtocol: /straight\s+leg\s+raising/gi,
  exerciseDuration: /(\d+)\s+minutes?/gi,
  postExercise: /post[-\s]?exercise/gi,
  // Catheter specifications
  frenchSize: /(\d+)f\s+(?:catheter|sheath)/gi,
  swanGanz: /swan[-\s]?ganz\s+catheter/gi,
  // Complications
  arrhythmias: /arrhythmias?|dysrhythmias?/gi,
  catheterKnotting: /catheter\s+(?:knotting|entanglement)/gi,
  tricuspidRegurgitation: /tricuspid\s+regurgitation/gi,
  pneumothorax: /pneumothorax/gi
};
const RightHeartCathValidationRules = {
  // Clinical language patterns that should be preserved
  clinicalPhrases: [
    "right heart catheterisation",
    "haemodynamic assessment",
    "elevated filling pressures",
    "preserved cardiac output",
    "pulmonary capillary wedge pressure",
    "thermodilution method",
    "Fick principle",
    "mixed venous oxygen saturation",
    "straight leg raising exercise"
  ],
  // Australian spelling requirements
  australianSpelling: [
    { us: "catheterization", au: "catheterisation" },
    { us: "hemodynamic", au: "haemodynamic" },
    { us: "anesthesia", au: "anaesthesia" },
    { us: "color", au: "colour" },
    { us: "recognize", au: "recognise" },
    { us: "optimize", au: "optimise" },
    { us: "utilize", au: "utilise" },
    { us: "center", au: "centre" }
  ]
};
({
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
});
class RightHeartCathAgent extends MedicalAgent {
  constructor() {
    super(
      "Right Heart Cath Agent",
      "Cardiology",
      "Generates comprehensive right heart catheterisation procedural reports with structured haemodynamic assessment",
      "right-heart-cath",
      "You are a specialist cardiologist generating right heart catheterisation procedural reports for medical records."
    );
    __publicField(this, "lmStudioService");
    // RHC-specific medical knowledge
    __publicField(this, "venousAccessSites", {
      "basilic": "right_basilic",
      "right basilic": "right_basilic",
      "internal jugular": "right_internal_jugular",
      "right internal jugular": "right_internal_jugular",
      "femoral": "right_femoral",
      "right femoral": "right_femoral"
    });
    __publicField(this, "rhcIndications", {
      "heart failure": "heart_failure",
      "pulmonary hypertension": "pulmonary_hypertension",
      "transplant evaluation": "transplant_evaluation",
      "haemodynamic assessment": "haemodynamic_assessment",
      "cardiomyopathy": "cardiomyopathy_evaluation"
    });
    __publicField(this, "normalValues", {
      ra: { min: 2, max: 8 },
      rv_systolic: { min: 15, max: 30 },
      rv_diastolic: { min: 2, max: 8 },
      rvedp: { max: 8 },
      pa_systolic: { min: 15, max: 30 },
      pa_diastolic: { min: 4, max: 12 },
      pa_mean: { min: 9, max: 18 },
      pcwp: { min: 6, max: 15 },
      co: { min: 4, max: 8 },
      ci: { min: 2.5, max: 4 },
      mixed_venous_o2: { min: 65, max: 75 }
    });
    // Medical terminology corrections for RHC with Australian spelling
    __publicField(this, "rhcTerminologyCorrections", {
      "right heart cath": "right heart catheterisation",
      "rhc": "right heart catheterisation",
      "catheterization": "catheterisation",
      "hemodynamic": "haemodynamic",
      "anesthesia": "anaesthesia",
      "color doppler": "colour Doppler",
      "color": "colour",
      "recognize": "recognise",
      "optimize": "optimise",
      "utilize": "utilise",
      "center": "centre",
      "pulmonary wedge": "pulmonary capillary wedge pressure",
      "wedge pressure": "PCWP",
      "swan ganz": "Swan-Ganz catheter",
      "thermodilution": "thermodilution"
    });
    this.lmStudioService = LMStudioService.getInstance();
  }
  async process(input, context) {
    const startTime = Date.now();
    try {
      this.updateMemory("currentInput", input);
      this.updateMemory("processingContext", context);
      const correctedInput = this.correctRHCTerminology(input);
      const rhcData = this.extractRHCData(correctedInput);
      const haemodynamicPressures = this.extractHaemodynamicPressures(correctedInput);
      const cardiacOutput = this.extractCardiacOutput(correctedInput);
      const exerciseHaemodynamics = this.extractExerciseHaemodynamics(correctedInput);
      const complications = this.identifyComplications(correctedInput);
      const reportContent = await this.generateStructuredReport(
        rhcData,
        haemodynamicPressures,
        cardiacOutput,
        exerciseHaemodynamics,
        complications,
        correctedInput
      );
      const sections = this.parseResponse(reportContent, context);
      const processingTime = Date.now() - startTime;
      const report = {
        ...this.createReport(reportContent, sections, context, processingTime, 0.95),
        rhcData,
        haemodynamicPressures,
        cardiacOutput,
        exerciseHaemodynamics,
        complications
      };
      this.addProcedureMemory("RHC", {
        indication: rhcData.indication,
        accessSite: rhcData.vascularAccess,
        cardiacOutput: cardiacOutput.thermodilution.co,
        complications: complications.length
      }, "successful");
      return report;
    } catch (error) {
      console.error("RHC processing error:", error);
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `RHC processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
          [],
          context,
          processingTime,
          0.1
        ),
        rhcData: this.getEmptyRHCData(),
        haemodynamicPressures: this.getEmptyHaemodynamicPressures(),
        cardiacOutput: this.getEmptyCardiacOutput(),
        exerciseHaemodynamics: null,
        complications: []
      };
    }
  }
  buildMessages(input, _context) {
    const systemPrompt = RightHeartCathSystemPrompts.rightHeartCathProcedureAgent.systemPrompt;
    const userPrompt = RightHeartCathSystemPrompts.rightHeartCathProcedureAgent.userPromptTemplate.replace("{input}", input);
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
  }
  parseResponse(response, _context) {
    const sections = [];
    const lines = response.split("\n");
    let currentSection = null;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      if (this.isSectionHeader(trimmedLine)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: this.cleanSectionTitle(trimmedLine),
          content: "",
          type: "structured",
          priority: this.getSectionPriority(trimmedLine)
        };
      } else if (currentSection) {
        currentSection.content += (currentSection.content ? "\n" : "") + trimmedLine;
      }
    }
    if (currentSection) {
      sections.push(currentSection);
    }
    return sections;
  }
  correctRHCTerminology(text) {
    let correctedText = text;
    for (const [incorrect, correct] of Object.entries(this.rhcTerminologyCorrections)) {
      const regex = new RegExp(incorrect, "gi");
      correctedText = correctedText.replace(regex, correct);
    }
    for (const { us, au } of RightHeartCathValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, "gi");
      correctedText = correctedText.replace(regex, au);
    }
    for (const phrase of RightHeartCathValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      if (regex.test(correctedText)) {
        correctedText = correctedText.replace(regex, phrase);
      }
    }
    return correctedText;
  }
  extractRHCData(input) {
    return {
      procedureType: "Right Heart Catheterisation",
      indication: this.extractIndication(input),
      clinicalPresentation: this.extractClinicalPresentation(input),
      recentInvestigations: this.extractRecentInvestigations(input),
      vascularAccess: this.extractVascularAccess(input),
      catheterDetails: this.extractCatheterDetails(input),
      laboratoryValues: this.extractLaboratoryValues(input),
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }
  extractHaemodynamicPressures(input) {
    return {
      ra: {
        aWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressurea),
        vWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressureV),
        mean: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressureMean)
      },
      rv: {
        systolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvPressureSystolic),
        diastolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvPressureDiastolic),
        rvedp: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvedp)
      },
      pa: {
        systolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureSystolic),
        diastolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureDiastolic),
        mean: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureMean)
      },
      pcwp: {
        aWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureA),
        vWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureV),
        mean: this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureMean)
      }
    };
  }
  extractCardiacOutput(input) {
    return {
      thermodilution: {
        co: this.extractMeasurement(input, RightHeartCathMedicalPatterns.thermodilutionCO),
        ci: this.extractMeasurement(input, RightHeartCathMedicalPatterns.thermodilutionCI)
      },
      fick: {
        co: this.extractMeasurement(input, RightHeartCathMedicalPatterns.fickCO),
        ci: this.extractMeasurement(input, RightHeartCathMedicalPatterns.fickCI)
      },
      mixedVenousO2: this.extractMeasurement(input, RightHeartCathMedicalPatterns.mixedVenousO2),
      wedgeSaturation: this.extractMeasurement(input, RightHeartCathMedicalPatterns.wedgeSaturation)
    };
  }
  extractExerciseHaemodynamics(input) {
    const text = input.toLowerCase();
    if (!RightHeartCathMedicalPatterns.exerciseProtocol.test(text) && !RightHeartCathMedicalPatterns.postExercise.test(text)) {
      return null;
    }
    const durationMatch = text.match(RightHeartCathMedicalPatterns.exerciseDuration);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 2;
    const postExerciseText = text.split(/post[-\s]?exercise/i)[1] || "";
    return {
      protocol: "Straight leg raising",
      duration: `${duration} minutes`,
      preExercise: this.extractHaemodynamicPressures(input),
      // Use full input for baseline
      postExercise: this.extractHaemodynamicPressures(postExerciseText),
      // Use post-exercise text
      response: this.calculateExerciseResponse(input)
    };
  }
  identifyComplications(input) {
    const text = input.toLowerCase();
    const complications = [];
    const complicationPatterns = [
      {
        pattern: RightHeartCathMedicalPatterns.arrhythmias,
        type: "arrhythmias",
        severity: "minor"
      },
      {
        pattern: RightHeartCathMedicalPatterns.catheterKnotting,
        type: "catheter_knotting",
        severity: "major"
      },
      {
        pattern: RightHeartCathMedicalPatterns.tricuspidRegurgitation,
        type: "tricuspid_regurgitation",
        severity: "minor"
      },
      {
        pattern: RightHeartCathMedicalPatterns.pneumothorax,
        type: "pneumothorax",
        severity: "major"
      }
    ];
    for (const { pattern, type, severity } of complicationPatterns) {
      if (pattern.test(text)) {
        complications.push({
          type,
          severity,
          description: this.extractComplicationDescription(text, pattern),
          management: this.extractComplicationManagement(text, pattern)
        });
      }
    }
    return complications;
  }
  async generateStructuredReport(rhcData, haemodynamicPressures, cardiacOutput, exerciseHaemodynamics, complications, originalInput) {
    console.log("🔧 Generating RHC report with LMStudio medgemma-27b...");
    try {
      const extractedData = {
        rhcData,
        haemodynamicPressures,
        cardiacOutput,
        exerciseHaemodynamics,
        complications
      };
      const contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive right heart catheterisation procedural report using the above extracted data and the following dictation. Include all relevant pressure measurements, cardiac output calculations, and haemodynamic assessments. Use proper Australian medical terminology (catheterisation, haemodynamic, colour) and structured formatting with precise units.`;
      const report = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);
      console.log("✅ RHC report generated successfully");
      return report;
    } catch (error) {
      console.error("❌ Error generating RHC report:", error);
      return `**PREAMBLE**
Patient underwent right heart catheterisation for ${rhcData.indication.replace("_", " ")} assessment. ${rhcData.clinicalPresentation ? `Clinical presentation included ${rhcData.clinicalPresentation}.` : ""} ${rhcData.recentInvestigations ? `Recent investigations demonstrated ${rhcData.recentInvestigations}.` : ""} Vascular access was planned via ${rhcData.vascularAccess.replace("_", " ")}.

**FINDINGS**
Right heart catheterisation was performed via ${rhcData.vascularAccess.replace("_", " ")} approach with successful catheter positioning. Resting haemodynamic assessment revealed right atrial pressures with ${haemodynamicPressures.ra.aWave ? `a wave of ${haemodynamicPressures.ra.aWave} mmHg` : "normal a wave"}, ${haemodynamicPressures.ra.vWave ? `v wave of ${haemodynamicPressures.ra.vWave} mmHg` : "normal v wave"}, and ${haemodynamicPressures.ra.mean ? `mean pressure of ${haemodynamicPressures.ra.mean} mmHg` : "normal mean pressure"}.

Right ventricular pressures demonstrated ${haemodynamicPressures.rv.systolic ? `systolic pressure of ${haemodynamicPressures.rv.systolic} mmHg` : "normal systolic pressure"} with ${haemodynamicPressures.rv.diastolic ? `diastolic pressure of ${haemodynamicPressures.rv.diastolic} mmHg` : "normal diastolic pressure"} and ${haemodynamicPressures.rv.rvedp ? `right ventricular end-diastolic pressure of ${haemodynamicPressures.rv.rvedp} mmHg` : "normal end-diastolic pressure"}.

Pulmonary artery pressures showed ${haemodynamicPressures.pa.systolic ? `systolic pressure of ${haemodynamicPressures.pa.systolic} mmHg` : "normal systolic pressure"}, ${haemodynamicPressures.pa.diastolic ? `diastolic pressure of ${haemodynamicPressures.pa.diastolic} mmHg` : "normal diastolic pressure"}, and ${haemodynamicPressures.pa.mean ? `mean pressure of ${haemodynamicPressures.pa.mean} mmHg` : "normal mean pressure"}.

Cardiac output assessment by thermodilution demonstrated ${cardiacOutput.thermodilution.co ? `${cardiacOutput.thermodilution.co} L/min` : "normal cardiac output"} with ${cardiacOutput.thermodilution.ci ? `cardiac index of ${cardiacOutput.thermodilution.ci} L/min/m²` : "normal cardiac index"}. ${cardiacOutput.fick.co ? `Fick method confirmed cardiac output of ${cardiacOutput.fick.co} L/min.` : ""} ${cardiacOutput.mixedVenousO2 ? `Mixed venous oxygen saturation was ${cardiacOutput.mixedVenousO2}%.` : ""} ${rhcData.laboratoryValues.haemoglobin ? `Laboratory assessment showed haemoglobin of ${rhcData.laboratoryValues.haemoglobin} g/L` : ""}${rhcData.laboratoryValues.lactate ? ` and lactate of ${rhcData.laboratoryValues.lactate} mmol/L.` : "."}

**CONCLUSION**
The haemodynamic assessment demonstrates findings consistent with the clinical indication. ${complications.length > 0 ? `Procedural complications included ${complications.map((c) => c.description).join(", ")}.` : "No procedural complications were encountered."} ${rhcData.recommendations ? rhcData.recommendations : "Further management recommendations will be based on these findings."} ${rhcData.followUp ? rhcData.followUp : "Follow-up assessment is planned as clinically indicated."}

Note: This report was generated with limited AI processing. Clinical review is recommended.`;
    }
  }
  // Helper methods for data extraction
  extractMeasurement(text, pattern) {
    const matches = text.match(pattern);
    return matches ? matches[matches.length - 1] : null;
  }
  extractIndication(input) {
    const text = input.toLowerCase();
    for (const [key, value] of Object.entries(this.rhcIndications)) {
      if (text.includes(key)) {
        return value;
      }
    }
    return "haemodynamic_assessment";
  }
  extractVascularAccess(input) {
    const text = input.toLowerCase();
    for (const [key, value] of Object.entries(this.venousAccessSites)) {
      if (text.includes(key)) {
        return value;
      }
    }
    return "right_femoral";
  }
  extractClinicalPresentation(input) {
    return this.extractValue(input, /(?:clinical\s+)?presentation[:\s]+([^.]+)/i) || "";
  }
  extractRecentInvestigations(input) {
    return this.extractValue(input, /(?:recent\s+)?(?:echo|echocardiography|investigation)[:\s]+([^.]+)/i) || "";
  }
  extractCatheterDetails(input) {
    const frenchMatch = input.match(RightHeartCathMedicalPatterns.frenchSize);
    const swanGanzMatch = input.match(RightHeartCathMedicalPatterns.swanGanz);
    if (frenchMatch) return `${frenchMatch[1]}F catheter`;
    if (swanGanzMatch) return "Swan-Ganz catheter";
    return "Thermodilution catheter";
  }
  extractLaboratoryValues(input) {
    return {
      haemoglobin: this.extractMeasurement(input, RightHeartCathMedicalPatterns.haemoglobin),
      lactate: this.extractMeasurement(input, RightHeartCathMedicalPatterns.lactate)
    };
  }
  extractImmediateOutcomes(input) {
    return this.extractValue(input, /(?:outcomes?|results?)[:\s]+([^.]+)/i) || "";
  }
  extractRecommendations(input) {
    return this.extractValue(input, /recommendations?[:\s]+([^.]+)/i) || "";
  }
  extractFollowUp(input) {
    return this.extractValue(input, /follow[- ]?up[:\s]+([^.]+)/i) || "";
  }
  extractValue(input, pattern) {
    const match = input.match(pattern);
    return match ? match[1].trim() : void 0;
  }
  calculateExerciseResponse(input) {
    return "Exercise response assessed with pressure changes documented";
  }
  extractComplicationDescription(text, pattern) {
    const match = text.match(pattern);
    return match ? match[0] : "Complication identified";
  }
  extractComplicationManagement(text, pattern) {
    const match = text.match(pattern);
    if (match) {
      const index = match.index || 0;
      const afterText = text.substring(index + match[0].length, index + match[0].length + 200);
      const managementMatch = afterText.match(/(?:managed|treated|addressed)[^.]+/i);
      return managementMatch ? managementMatch[0] : void 0;
    }
    return void 0;
  }
  // Helper methods for empty data structures
  getEmptyRHCData() {
    return {
      procedureType: "Right Heart Catheterisation",
      indication: "haemodynamic_assessment",
      clinicalPresentation: "",
      recentInvestigations: "",
      vascularAccess: "right_femoral",
      catheterDetails: "Thermodilution catheter",
      laboratoryValues: {
        haemoglobin: null,
        lactate: null
      },
      immediateOutcomes: "",
      recommendations: "",
      followUp: ""
    };
  }
  getEmptyHaemodynamicPressures() {
    return {
      ra: { aWave: null, vWave: null, mean: null },
      rv: { systolic: null, diastolic: null, rvedp: null },
      pa: { systolic: null, diastolic: null, mean: null },
      pcwp: { aWave: null, vWave: null, mean: null }
    };
  }
  getEmptyCardiacOutput() {
    return {
      thermodilution: { co: null, ci: null },
      fick: { co: null, ci: null },
      mixedVenousO2: null,
      wedgeSaturation: null
    };
  }
  // Section parsing helpers
  isSectionHeader(line) {
    return line.startsWith("**") && line.endsWith("**") || line.toUpperCase() === line && line.length > 3;
  }
  cleanSectionTitle(line) {
    return line.replace(/\*\*/g, "").replace(/:/g, "").trim();
  }
  getSectionPriority(line) {
    const highPriority = ["findings", "procedure", "indication", "complications", "assessment"];
    const title = line.toLowerCase();
    for (const keyword of highPriority) {
      if (title.includes(keyword)) return "high";
    }
    return "medium";
  }
}
export {
  RightHeartCathAgent
};
