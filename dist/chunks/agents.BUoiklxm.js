var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { L as LMStudioService } from "./services.NrlqZpNE.js";
class MedicalAgent {
  constructor(name, specialty, description, agentType, systemPrompt) {
    __publicField(this, "name");
    __publicField(this, "specialty");
    __publicField(this, "description");
    __publicField(this, "agentType");
    __publicField(this, "memory");
    __publicField(this, "systemPrompt");
    this.name = name;
    this.specialty = specialty;
    this.description = description;
    this.agentType = agentType;
    this.systemPrompt = systemPrompt;
    this.memory = this.initializeMemory();
  }
  getMemory() {
    return { ...this.memory };
  }
  setMemory(memory) {
    this.memory = { ...memory };
  }
  updateMemory(key, value, isLongTerm = false) {
    if (isLongTerm) {
      this.memory.longTerm[key] = value;
    } else {
      this.memory.shortTerm[key] = value;
    }
    this.memory.lastUpdated = Date.now();
  }
  getMemoryValue(key, fromLongTerm = false) {
    return fromLongTerm ? this.memory.longTerm[key] : this.memory.shortTerm[key];
  }
  addProcedureMemory(type, details, outcome) {
    this.memory.procedures.push({
      type,
      date: Date.now(),
      details,
      outcome
    });
    if (this.memory.procedures.length > 10) {
      this.memory.procedures = this.memory.procedures.slice(-10);
    }
  }
  createReport(content, sections, context, processingTime = 0, confidence = 0.9, warnings = [], errors = []) {
    return {
      id: this.generateReportId(),
      agentName: this.name,
      content,
      sections,
      metadata: {
        procedureType: context?.procedureType,
        confidence,
        processingTime,
        modelUsed: "LMStudio"
      },
      timestamp: Date.now(),
      warnings: warnings.length > 0 ? warnings : void 0,
      errors: errors.length > 0 ? errors : void 0
    };
  }
  cleanMedicalText(text) {
    return text.replace(/\s+/g, " ").replace(/([.!?])\s*([A-Z])/g, "$1 $2").trim();
  }
  extractMedicalTerms(text) {
    const medicalPatterns = [
      /\b(?:mg|mcg|g|ml|cc|units?)\b/gi,
      /\b\d+\s*(?:mg|mcg|g|ml|cc|units?)\b/gi,
      /\b(?:systolic|diastolic|blood pressure|BP)\b/gi,
      /\b(?:EF|ejection fraction)\s*(?:of\s*)?\d+%?\b/gi,
      /\b(?:stenosis|regurgitation|insufficiency)\b/gi,
      // Enhanced stenosis terminology patterns - preserve qualitative terms
      /\b(?:mild|moderate|severe|critical)\s+(?:stenosis|regurgitation|insufficiency)\b/gi,
      /\b(?:stenosis|regurgitation|insufficiency)\s+(?:mild|moderate|severe|critical)\b/gi,
      // TIMI flow patterns - preserve descriptive language
      /\b(?:TIMI|timi)\s+(?:flow\s+)?(?:0|I|II|III|zero|one|two|three)\b/gi,
      /\b(?:normal|delayed|absent|complete)\s+(?:flow|perfusion)\b/gi,
      // Percentage patterns with context
      /\b\d+(?:-\d+)?%\s+stenosis\b/gi,
      /\bstenosis\s+\d+(?:-\d+)?%\b/gi
    ];
    const terms = [];
    medicalPatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        terms.push(...matches);
      }
    });
    return [...new Set(terms)];
  }
  initializeMemory() {
    return {
      shortTerm: {},
      longTerm: {},
      procedures: [],
      lastUpdated: Date.now()
    };
  }
  generateReportId() {
    return `${this.agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
const TAVISystemPrompts = {
  /**
   * TAVI Procedure Report Agent System Prompt
   * Enhanced with comprehensive medical knowledge from clinical examples
   */
  taviProcedureAgent: {
    systemPrompt: `You are a specialist interventional cardiologist generating TAVI procedural reports for medical records.

CRITICAL INSTRUCTIONS:
- Generate a PROCEDURAL REPORT in operation report style, NOT a consultation letter
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- Use professional, clinical language matching interventional cardiology standards
- Structure report in exactly THREE sections with specific clinical content

Required sections (use exactly these headers):

**PREAMBLE**:
- Patient demographics with indication for TAVI
- Preoperative CT findings: "suitable anatomy for valve implant from percutaneous approach"
- Valve morphology: tricuspid/bicuspid, calcification burden, calcium score
- Coronary disease assessment and existing stents
- Transthoracic echo findings with mean gradient and systolic function
- Valve selection rationale: "Based on annular perimeter and area, and burden of LVOT calcium, a [manufacturer] [size] valve was chosen"

**PROCEDURE**:
- Anaesthesia approach: "under local anaesthesia and deep sedation"
- Vascular access: radial for planning, femoral with ultrasound guidance
- Pre-closure technique: "ProStyle sutures" or equivalent closure devices
- Sheath exchange: specific French sizes (e.g., "16F Cook sheath")
- Valve crossing and wire placement: "AL1 and straight wire", "invasive gradient", "LVEDP"
- Guide wire: "Lunderquist wire placed at left ventricular apex"
- Pre-dilation: balloon size and technique
- Valve deployment: "at the level of the annular plane" with positioning details
- Immediate assessment: aortic regurgitation grade, coronary patency
- Closure: arteriotomy site closure with specific devices
- Post-operative echo findings

**CONCLUSION**:
- Simple success statement: "Successful implant of a [size] [manufacturer] valve"
- Final valve function assessment
- Post-procedural valve performance

CLINICAL LANGUAGE REQUIREMENTS:
- Australian spelling: anaesthesia, recognised, utilised, colour
- Precise measurements: "mean gradient of 39mmHg", "calcium score of 3222"
- Technical terminology: "annular perimeter and area", "LVOT calcium", "patent coronaries"
- Access descriptions: "under ultrasound guidance", "adequate puncture confirmed on fluoroscopy"
- Procedural details: "pre-closure performed", "valve crossed using", "partial recaptures for optimal positioning"
- Assessment language: "well-seated valve", "mild aortic regurgitation", "patent coronaries"

VALVE-SPECIFIC TERMINOLOGY:
- Edwards: "Edwards Sapien 3 Ultra", "Edwards Sapien 3"
- Medtronic: "Medtronic Evolut R", "Medtronic Evolut Pro", "Medtronic Evolut FX"
- Balloon-expandable vs self-expanding valve characteristics
- Valve sizing based on CT measurements

HEMODYNAMIC DOCUMENTATION:
- Pre/post gradients with specific values
- Invasive measurements during procedure
- LVEDP (Left Ventricular End-Diastolic Pressure)
- Aortic regurgitation grading: none/trace/mild/moderate/severe
- Valve area calculations when relevant

Use standard interventional cardiology procedural documentation format.
Target audience: Medical record documentation for interventional cardiologists, cardiothoracic surgeons, and referring physicians.`,
    userPromptTemplate: `Generate a comprehensive TAVI procedural report using the THREE-SECTION format based on the following procedural dictation:

{input}

Structure the report with exactly these three sections:

**PREAMBLE**:
- Start with patient demographics and indication
- Include preoperative CT findings and valve morphology
- Document echo measurements and valve selection rationale
- Use clinical language: "suitable anatomy for valve implant", "heavily calcified", "Based on annular perimeter and area..."

**PROCEDURE**:
- Document anaesthesia and access approach
- Include specific technical details: wire types, sheath sizes, closure methods
- Describe valve deployment with positioning details
- Document immediate outcomes and measurements
- Use procedural terminology: "under ultrasound guidance", "pre-closure performed", "at the level of the annular plane"

**CONCLUSION**:
- Provide simple success statement: "Successful implant of a [size] [manufacturer] valve"
- Document final valve function
- Include immediate post-procedural status

Preserve all medical facts accurately with Australian spelling and interventional cardiology terminology. Use precise measurements with units (mmHg, cm², French sizes).`
  }
};
const TAVIMedicalPatterns = {
  // Hemodynamic measurement patterns (enhanced)
  meanGradient: /mean\s+gradient\s+(?:of\s+)?(\d+)\s*mm\s*hg/gi,
  peakGradient: /peak\s+gradient\s+(?:of\s+)?(\d+)\s*mm\s*hg/gi,
  invasiveGradient: /invasive\s+gradient\s+(?:of\s+)?(\d+)\s*mm\s*hg/gi,
  valveArea: /(?:aortic\s+)?valve\s+area\s+(?:of\s+)?(\d+\.?\d*)\s*cm²?/gi,
  lvef: /(?:lvef|left\s+ventricular\s+ejection\s+fraction)\s+(?:of\s+)?(\d+)\s*%/gi,
  lvedp: /(?:lvedp|left\s+ventricular\s+end[-\s]?diastolic\s+pressure)\s+(?:of\s+)?(\d+)\s*mm\s*hg/gi,
  calciumScore: /calcium\s+score\s+(?:of\s+)?(\d+)/gi,
  // Valve specifications (enhanced)
  valveSize: /(?:valve\s+)?(?:size\s+)?(\d{2}mm)/gi,
  edwardsValves: /(?:edwards\s+sapien\s+3\s+ultra|edwards\s+sapien\s+3|edwards\s+sapien)/gi,
  medtronicValves: /(?:medtronic\s+evolut\s+(?:r|pro|fx)|medtronic\s+evolut)/gi,
  valveManufacturer: /(?:edwards|sapien|medtronic|evolut|boston\s+scientific|acurate|abbott|portico|lotus)/gi
};
const TAVIValidationRules = {
  // Clinical language patterns that should be preserved
  clinicalPhrases: [
    "suitable anatomy for valve implant",
    "heavily calcified",
    "patent coronaries",
    "well-seated valve",
    "under ultrasound guidance",
    "adequate puncture confirmed",
    "at the level of the annular plane",
    "preserved systolic function",
    "mild aortic regurgitation"
  ],
  // Australian spelling requirements
  australianSpelling: [
    { us: "anesthesia", au: "anaesthesia" },
    { us: "recognize", au: "recognise" },
    { us: "optimize", au: "optimise" },
    { us: "utilize", au: "utilise" },
    { us: "color", au: "colour" },
    { us: "center", au: "centre" }
  ]
};
({
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
});
class TAVIAgent extends MedicalAgent {
  constructor() {
    super(
      "TAVI Procedure Agent",
      "Interventional Cardiology",
      "Generates comprehensive TAVI procedural reports with valve assessment and hemodynamic analysis",
      "tavi",
      "You are a specialist interventional cardiologist generating TAVI procedural reports for medical records."
    );
    __publicField(this, "lmStudioService");
    // TAVI-specific medical knowledge
    __publicField(this, "valveTypes", {
      "sapien": "Edwards SAPIEN",
      "evolut": "Medtronic Evolut",
      "acurate": "Boston Scientific ACURATE",
      "portico": "Abbott Portico",
      "lotus": "Boston Scientific Lotus"
    });
    __publicField(this, "valveSizes", {
      "20mm": "20mm",
      "23mm": "23mm",
      "26mm": "26mm",
      "29mm": "29mm",
      "34mm": "34mm"
    });
    __publicField(this, "accessRoutes", {
      "transfemoral": "Transfemoral approach",
      "transapical": "Transapical approach",
      "transaortic": "Transaortic approach",
      "transcaval": "Transcaval approach",
      "transcarotid": "Transcarotid approach"
    });
    __publicField(this, "aorticRegurgitationGrades", {
      "none": "none",
      "trace": "trace",
      "mild": "mild",
      "moderate": "moderate",
      "severe": "severe"
    });
    // Medical terminology corrections for TAVI
    __publicField(this, "taviTerminologyCorrections", {
      "transcatheter aortic valve replacement": "TAVR",
      "transcatheter aortic valve implantation": "TAVI",
      "edwards sapien": "Edwards SAPIEN",
      "medtronic evolut": "Medtronic Evolut",
      "trans femoral": "transfemoral",
      "trans apical": "transapical",
      "aortic valve area": "AVA",
      "left ventricular ejection fraction": "LVEF",
      "paravalvular regurgitation": "paravalvular leak",
      "millimeter": "mm",
      "millimeters of mercury": "mmHg",
      "centimeter squared": "cm²"
    });
    this.lmStudioService = LMStudioService.getInstance();
  }
  async process(input, context) {
    const startTime = Date.now();
    try {
      this.updateMemory("currentInput", input);
      this.updateMemory("processingContext", context);
      const correctedInput = this.correctTAVITerminology(input);
      const taviData = this.extractTAVIData(correctedInput);
      const hemodynamics = this.extractHemodynamicData(correctedInput);
      const valveAssessment = this.assessValvePositioning(correctedInput);
      const complications = this.identifyComplications(correctedInput);
      const messages = this.buildMessages(correctedInput, context);
      const reportContent = await this.generateStructuredReport(
        taviData,
        hemodynamics,
        valveAssessment,
        complications,
        correctedInput
      );
      const sections = this.parseResponse(reportContent, context);
      const processingTime = Date.now() - startTime;
      const report = {
        ...this.createReport(reportContent, sections, context, processingTime, 0.95),
        taviData,
        hemodynamics,
        valveAssessment,
        complications
      };
      this.addProcedureMemory("TAVI", {
        valve: taviData.valveDetails,
        hemodynamics,
        complications: complications.length
      }, valveAssessment.deploymentSuccess);
      return report;
    } catch (error) {
      console.error("TAVI processing error:", error);
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `TAVI processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
          [],
          context,
          processingTime,
          0.1
        ),
        taviData: this.getEmptyTAVIData(),
        hemodynamics: this.getEmptyHemodynamicData(),
        valveAssessment: this.getEmptyValveAssessment(),
        complications: []
      };
    }
  }
  buildMessages(input, context) {
    const systemPrompt = TAVISystemPrompts.taviProcedureAgent.systemPrompt;
    const userPrompt = TAVISystemPrompts.taviProcedureAgent.userPromptTemplate.replace("{input}", input);
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
  }
  parseResponse(response, context) {
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
  correctTAVITerminology(text) {
    let correctedText = text;
    for (const [incorrect, correct] of Object.entries(this.taviTerminologyCorrections)) {
      const regex = new RegExp(incorrect, "gi");
      correctedText = correctedText.replace(regex, correct);
    }
    for (const { us, au } of TAVIValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, "gi");
      correctedText = correctedText.replace(regex, au);
    }
    for (const phrase of TAVIValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      if (regex.test(correctedText)) {
        correctedText = correctedText.replace(regex, phrase);
      }
    }
    return correctedText;
  }
  extractTAVIData(input) {
    const text = input.toLowerCase();
    return {
      procedureType: text.includes("tavr") ? "TAVR" : "TAVI",
      indication: this.extractIndication(input),
      riskAssessment: this.extractRiskAssessment(input),
      accessApproach: this.extractAccessApproach(input),
      preImplant: this.extractPreImplantData(input),
      valveDetails: this.extractValveDetails(input),
      proceduralDetails: this.extractProceduralDetails(input),
      postImplant: this.extractPostImplantData(input),
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }
  extractHemodynamicData(input) {
    const text = input.toLowerCase();
    const meanGradientPattern = TAVIMedicalPatterns.meanGradient;
    const peakGradientPattern = TAVIMedicalPatterns.peakGradient;
    const invasiveGradientPattern = TAVIMedicalPatterns.invasiveGradient;
    const valveAreaPattern = TAVIMedicalPatterns.valveArea;
    const lvefPattern = TAVIMedicalPatterns.lvef;
    const lvedpPattern = TAVIMedicalPatterns.lvedp;
    const calciumScorePattern = TAVIMedicalPatterns.calciumScore;
    const parts = text.split(/(?:post[-\s]?(?:implant|operative|procedural)|after\s+(?:implant|deployment|valve)|final|immediate\s+(?:assessment|outcome))/i);
    const preText = parts[0] || "";
    const postText = parts.length > 1 ? parts[1] : "";
    const preMean = this.extractMeasurement(preText, meanGradientPattern);
    const prePeak = this.extractMeasurement(preText, peakGradientPattern);
    const invasiveGradient = this.extractMeasurement(input, invasiveGradientPattern);
    const preArea = this.extractMeasurement(preText, valveAreaPattern);
    const preLVEF = this.extractMeasurement(preText, lvefPattern);
    const lvedp = this.extractMeasurement(input, lvedpPattern);
    const calciumScore = this.extractMeasurement(input, calciumScorePattern);
    const postMean = this.extractMeasurement(postText, meanGradientPattern);
    const postPeak = this.extractMeasurement(postText, peakGradientPattern);
    const postLVEF = this.extractMeasurement(postText, lvefPattern);
    const gradientImprovement = this.calculateGradientImprovement(
      preMean,
      postMean,
      prePeak,
      postPeak
    );
    return {
      preImplant: {
        meanGradient: preMean ? `${preMean} mmHg` : "",
        peakGradient: prePeak ? `${prePeak} mmHg` : "",
        invasiveGradient: invasiveGradient ? `${invasiveGradient} mmHg` : "",
        valveArea: preArea ? `${preArea} cm²` : "",
        lvef: preLVEF ? `${preLVEF}%` : "",
        lvedp: lvedp ? `${lvedp} mmHg` : "",
        calciumScore: calciumScore ? calciumScore : ""
      },
      postImplant: {
        meanGradient: postMean ? `${postMean} mmHg` : "",
        peakGradient: postPeak ? `${postPeak} mmHg` : "",
        lvef: postLVEF ? `${postLVEF}%` : ""
      },
      gradientImprovement
    };
  }
  assessValvePositioning(input) {
    const text = input.toLowerCase();
    let deploymentSuccess = "unknown";
    if (text.includes("well positioned") || text.includes("appropriate position")) {
      deploymentSuccess = "successful";
    } else if (text.includes("malposition") || text.includes("migration")) {
      deploymentSuccess = "complicated";
    }
    let paravalvularLeak = "unknown";
    if (text.includes("no paravalvular") || text.includes("trace paravalvular")) {
      paravalvularLeak = "minimal";
    } else if (text.includes("mild paravalvular")) {
      paravalvularLeak = "mild";
    } else if (text.includes("moderate paravalvular")) {
      paravalvularLeak = "moderate";
    } else if (text.includes("severe paravalvular")) {
      paravalvularLeak = "severe";
    }
    const complications = this.extractPositioningComplications(text);
    return {
      deploymentSuccess,
      positionRelativeToAnnulus: deploymentSuccess === "successful" ? "appropriate" : "unknown",
      valveGeometry: deploymentSuccess === "successful" ? "normal" : "unknown",
      paravalvularLeak,
      complications
    };
  }
  identifyComplications(input) {
    const text = input.toLowerCase();
    const complications = [];
    const complicationPatterns = [
      {
        pattern: /migration|embolization/i,
        type: "valve_migration",
        severity: "major"
      },
      {
        pattern: /paravalvular.*(?:leak|regurgitation)/i,
        type: "paravalvular_leak",
        severity: "minor"
      },
      {
        pattern: /coronary.*(?:occlusion|compromise)/i,
        type: "coronary_occlusion",
        severity: "life-threatening"
      },
      {
        pattern: /(?:conduction|heart).*block/i,
        type: "conduction_block",
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
  async generateStructuredReport(taviData, hemodynamics, valveAssessment, complications, originalInput) {
    console.log("🔧 Generating TAVI report with LMStudio medgemma-27b...");
    try {
      const extractedData = {
        taviData,
        hemodynamics,
        valveAssessment,
        complications
      };
      const contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive TAVI procedural report using the above extracted data and the following dictation. Include all relevant valve specifications, hemodynamic measurements, deployment details, and outcomes. Use proper medical terminology and structured formatting.`;
      const report = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);
      console.log("✅ TAVI report generated successfully");
      return report;
    } catch (error) {
      console.error("❌ Error generating TAVI report:", error);
      return `**TRANSCATHETER AORTIC VALVE IMPLANTATION REPORT**

**INDICATION**: ${taviData.indication || "[Not specified in dictation]"}

**PROCEDURE**: 
- Access Approach: ${taviData.accessApproach.description}
- Valve: ${taviData.valveDetails.manufacturer} ${taviData.valveDetails.model} ${taviData.valveDetails.size}
- Deployment: ${valveAssessment.deploymentSuccess}

**HEMODYNAMICS**: 
- Pre-implant: Mean ${hemodynamics.preImplant.meanGradient}, Peak ${hemodynamics.preImplant.peakGradient}
- Post-implant: Mean ${hemodynamics.postImplant.meanGradient}, Peak ${hemodynamics.postImplant.peakGradient}

**COMPLICATIONS**: ${complications.length === 0 ? "[None specified]" : complications.map((c) => c.description).join(", ")}

**ASSESSMENT**: [Assessment not specified in dictation]

**RECOMMENDATIONS**: [Recommendations not specified in dictation]

Note: This report was generated with limited AI processing due to technical issues. Please review and complete manually.`;
    }
  }
  // Helper methods for data extraction
  extractMeasurement(text, pattern) {
    const matches = text.match(pattern);
    return matches ? matches[matches.length - 1] : null;
  }
  calculateGradientImprovement(preMean, postMean, prePeak, postPeak) {
    const improvement = {};
    if (preMean && postMean) {
      const preValue = parseInt(preMean);
      const postValue = parseInt(postMean);
      const delta = preValue - postValue;
      improvement.meanGradient = `${delta} mmHg reduction`;
    }
    if (prePeak && postPeak) {
      const preValue = parseInt(prePeak);
      const postValue = parseInt(postPeak);
      const delta = preValue - postValue;
      improvement.peakGradient = `${delta} mmHg reduction`;
    }
    return improvement;
  }
  extractIndication(input) {
    const indicationPattern = /indication[:\s]+([^.]+)/i;
    const match = input.match(indicationPattern);
    return match ? match[1].trim() : "";
  }
  extractRiskAssessment(input) {
    return {
      stsScore: this.extractValue(input, /sts\s+score[:\s]+([^.]+)/i),
      euroscore: this.extractValue(input, /euroscore[:\s]+([^.]+)/i),
      frailtyAssessment: this.extractValue(input, /frailty[:\s]+([^.]+)/i)
    };
  }
  extractAccessApproach(input) {
    const text = input.toLowerCase();
    for (const [key, description] of Object.entries(this.accessRoutes)) {
      if (text.includes(key)) {
        return {
          primary: key,
          description
        };
      }
    }
    return {
      primary: "transfemoral",
      // Default to most common approach
      description: "[Access approach not specified in dictation]"
    };
  }
  extractPreImplantData(input) {
    return {
      aorticValveArea: this.extractValue(input, /(?:aortic\s+)?valve\s+area[:\s]+([^.]+)/i) || "",
      meanGradient: this.extractValue(input, /mean\s+gradient[:\s]+([^.]+)/i) || "",
      peakGradient: this.extractValue(input, /peak\s+gradient[:\s]+([^.]+)/i) || "",
      lvef: this.extractValue(input, /lvef[:\s]+([^.]+)/i) || "",
      annulusDimensions: {}
    };
  }
  extractValveDetails(input) {
    const text = input.toLowerCase();
    const edwardsMatch = text.match(TAVIMedicalPatterns.edwardsValves);
    const medtronicMatch = text.match(TAVIMedicalPatterns.medtronicValves);
    const generalManufacturerMatch = text.match(TAVIMedicalPatterns.valveManufacturer);
    let manufacturer = "Edwards SAPIEN";
    if (edwardsMatch) {
      manufacturer = "Edwards SAPIEN";
    } else if (medtronicMatch) {
      manufacturer = "Medtronic Evolut";
    } else if (generalManufacturerMatch) {
      const match = generalManufacturerMatch[0].toLowerCase();
      if (match.includes("medtronic") || match.includes("evolut")) {
        manufacturer = "Medtronic Evolut";
      } else if (match.includes("edwards") || match.includes("sapien")) {
        manufacturer = "Edwards SAPIEN";
      } else if (match.includes("acurate")) {
        manufacturer = "Boston Scientific ACURATE";
      }
    }
    let size = "26mm";
    const sizeMatch = text.match(TAVIMedicalPatterns.valveSize);
    if (sizeMatch) {
      const extractedSize = sizeMatch[0];
      if (Object.keys(this.valveSizes).includes(extractedSize)) {
        size = extractedSize;
      }
    }
    let model = "";
    if (manufacturer === "Edwards SAPIEN") {
      if (text.includes("ultra")) model = "SAPIEN 3 Ultra";
      else if (text.includes("sapien 3")) model = "SAPIEN 3";
      else model = "SAPIEN";
    } else if (manufacturer === "Medtronic Evolut") {
      if (text.includes("evolut r")) model = "Evolut R";
      else if (text.includes("evolut pro")) model = "Evolut Pro";
      else if (text.includes("evolut fx")) model = "Evolut FX";
      else model = "Evolut";
    }
    return {
      manufacturer,
      model: model || manufacturer.split(" ")[1] || "Standard",
      size,
      positioning: this.extractValue(input, /(?:positioning|position)[:\s]+([^.]+)/i) || "",
      deploymentTechnique: this.extractValue(input, /deployment[:\s]+([^.]+)/i) || ""
    };
  }
  extractProceduralDetails(input) {
    return {
      contrastVolume: this.extractValue(input, /contrast[:\s]+([^.]+)/i) || "",
      fluoroscopyTime: this.extractValue(input, /fluoroscopy[:\s]+([^.]+)/i) || "",
      complications: this.extractValue(input, /complications[:\s]+([^.]+)/i) || "None",
      pacingRequired: this.extractValue(input, /pacing[:\s]+([^.]+)/i) || "",
      postDilatation: this.extractValue(input, /(?:post[- ]?dilatation|balloon)[:\s]+([^.]+)/i) || ""
    };
  }
  extractPostImplantData(input) {
    return {
      valvePosition: this.extractValue(input, /valve\s+position[:\s]+([^.]+)/i) || "",
      aorticRegurgitation: this.extractAorticRegurgitation(input),
      meanGradient: this.extractValue(input, /final.*mean\s+gradient[:\s]+([^.]+)/i) || "",
      peakGradient: this.extractValue(input, /final.*peak\s+gradient[:\s]+([^.]+)/i) || "",
      lvef: this.extractValue(input, /final.*lvef[:\s]+([^.]+)/i) || "",
      conductionIssues: this.extractValue(input, /conduction[:\s]+([^.]+)/i) || ""
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
  extractAorticRegurgitation(input) {
    const text = input.toLowerCase();
    for (const [key, value] of Object.entries(this.aorticRegurgitationGrades)) {
      if (text.includes(`${key} aortic regurgitation`) || text.includes(`${key} ar`)) {
        return value;
      }
    }
    return "none";
  }
  extractPositioningComplications(text) {
    const complications = [];
    if (text.includes("malposition")) complications.push("malposition");
    if (text.includes("migration")) complications.push("migration");
    if (text.includes("too high")) complications.push("high_position");
    if (text.includes("too low")) complications.push("low_position");
    return complications;
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
  getEmptyTAVIData() {
    return {
      procedureType: "TAVI",
      indication: "",
      riskAssessment: {},
      accessApproach: { primary: "transfemoral", description: "[Access approach not specified in dictation]" },
      preImplant: {
        aorticValveArea: "",
        meanGradient: "",
        peakGradient: "",
        lvef: "",
        annulusDimensions: {}
      },
      valveDetails: {
        manufacturer: "Edwards SAPIEN",
        model: "",
        size: "26mm",
        positioning: "",
        deploymentTechnique: ""
      },
      proceduralDetails: {
        contrastVolume: "",
        fluoroscopyTime: "",
        complications: "",
        pacingRequired: "",
        postDilatation: ""
      },
      postImplant: {
        valvePosition: "",
        aorticRegurgitation: "none",
        meanGradient: "",
        peakGradient: "",
        lvef: "",
        conductionIssues: ""
      },
      immediateOutcomes: "",
      recommendations: "",
      followUp: ""
    };
  }
  getEmptyHemodynamicData() {
    return {
      preImplant: {},
      postImplant: {},
      gradientImprovement: {}
    };
  }
  getEmptyValveAssessment() {
    return {
      deploymentSuccess: "unknown",
      positionRelativeToAnnulus: "",
      valveGeometry: "",
      paravalvularLeak: "unknown",
      complications: []
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
    const highPriority = ["procedure", "indication", "complications", "assessment"];
    const title = line.toLowerCase();
    for (const keyword of highPriority) {
      if (title.includes(keyword)) return "high";
    }
    return "medium";
  }
}
const TAVIAgent$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  TAVIAgent
}, Symbol.toStringTag, { value: "Module" }));
const ANGIOGRAM_PCI_SYSTEM_PROMPTS = {
  primary: `You are a specialist interventional cardiologist generating cardiac catheterization reports for medical records.

CRITICAL INSTRUCTIONS:
- Analyze the dictation to determine the procedure type: DIAGNOSTIC ANGIOGRAM, PCI INTERVENTION, or COMBINED
- Generate appropriate report format based on procedure type detected
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- Use structured clinical report format

PROCEDURE TYPE DETECTION:
**DIAGNOSTIC ANGIOGRAM ONLY** - When dictation contains vessel findings without intervention:
- Keywords: "findings", "assessment", "stenosis", vessel descriptions
- No intervention terminology (stent, balloon, PTCA, etc.)
- Format: Concise 3-section format (PREAMBLE, FINDINGS, CONCLUSION)

**PCI INTERVENTION** - When dictation includes intervention details:
- Keywords: "stent", "PTCA", "balloon", "intervention", device specifications
- Format: Comprehensive procedural report with intervention sections

**COMBINED ANGIOGRAM + PCI** - When dictation includes both diagnostic and intervention:
- Both diagnostic findings AND intervention details
- Format: Full procedural report covering diagnosis through intervention

DIAGNOSTIC ANGIOGRAM FORMAT (3-section):
**PREAMBLE**
- Patient demographics and clinical history ONLY if explicitly mentioned
- Procedure details (access site, catheters, technique) ONLY if specified
- Keep concise - 2-3 sentences maximum

**FINDINGS**
Present findings in this exact order:
- Left Main: [assessment]
- Left Anterior Descending: [proximal, mid, distal segments and branches]  
- Circumflex: [segments and marginal branches]
- Right Coronary Artery: [include dominance pattern]
- Left ventricle and valves: [LVEDP, wall motion, valve function if mentioned]

**CONCLUSION**
- Overall disease severity assessment
- Management recommendation (medical therapy, PCI, CABG, etc.)
- Keep to 1-2 sentences maximum

PCI INTERVENTION FORMAT (comprehensive):
**PROCEDURE PERFORMED**: Percutaneous Coronary Intervention (PCI)
**INDICATION**: Clinical presentation and indication
**VASCULAR ACCESS**: Access site, sheath size, approach details
**CORONARY ANATOMY**: Vessel dominance and baseline findings
**TARGET LESION**: Detailed lesion characteristics and location
**INTERVENTION STRATEGY**: Procedural approach and rationale
**DEVICE DEPLOYMENT**: Stent/balloon specifications and deployment details
**PROCEDURAL TECHNIQUE**: Step-by-step intervention details
**HEMODYNAMIC ASSESSMENT**: Pressure measurements and flow assessment
**ANGIOGRAPHIC RESULT**: Final angiographic outcome and TIMI flow
**COMPLICATIONS**: Procedural complications and management (if applicable)
**MEDICATION MANAGEMENT**: Antiplatelet and anticoagulation strategy
**FINAL ASSESSMENT**: Procedural success metrics and immediate outcomes
**RECOMMENDATIONS**: Post-procedural care and follow-up plan

MEDICAL TERMINOLOGY REQUIREMENTS:
- Use stenosis terminology EXACTLY as provided by clinician
- If they say "mild" - use "mild" (do NOT assume percentages unless explicitly stated)
- Preserve all original medical language and terminology
- For vessel segments: use clinician's terms (proximal, mid, distal, etc.)
- Australian spelling (recognise, optimise, colour, favour)
- Include specific device details (manufacturer, model, size, length) when mentioned
- Document TIMI flow using descriptive terms as stated
- Use precise measurements (mm for stent sizes, Fr for catheter sizes, mmHg for pressures)
- Report procedural success using standard metrics when applicable

CRITICAL: Adapt report structure based on procedure type detected in dictation.`,
  procedureDetection: `You are analyzing cardiac catheterization dictation to determine procedure type.

Analyze the following dictation and classify as:

1. **DIAGNOSTIC_ANGIOGRAM** - Pure diagnostic assessment
   - Contains vessel findings, stenosis descriptions, anatomical details
   - NO intervention terminology (stent, balloon, PTCA, device deployment)
   - Focus on vessel assessment and recommendations

2. **PCI_INTERVENTION** - Intervention procedure (with or without detailed diagnostic findings)
   - Contains intervention keywords: stent, PTCA, balloon angioplasty, device deployment
   - May include specific device details (manufacturer, model, size)
   - Procedural techniques and outcomes described

3. **COMBINED** - Both diagnostic findings AND intervention details
   - Comprehensive dictation with vessel findings AND intervention
   - Both diagnostic assessment and procedural intervention described

Return only one word: DIAGNOSTIC_ANGIOGRAM, PCI_INTERVENTION, or COMBINED`,
  missingInfoDetection: `You are reviewing cardiac catheterization dictation for completeness.

ASSESS MISSING INFORMATION for the detected procedure type:

**FOR DIAGNOSTIC ANGIOGRAM:**
- Vessel segments (LM, LAD, LCx, RCA, branches)
- Procedural details (access site, catheters, contrast, fluoroscopy time)
- Functional assessment (LVEDP, dominance, collaterals)
- Hemodynamics (pressures, cardiac output)

**FOR PCI INTERVENTION:**
- All diagnostic elements above PLUS:
- Target lesion characteristics
- Device specifications (stent type, size, manufacturer)
- Procedural technique details
- Angiographic outcomes (TIMI flow, residual stenosis)
- Complications (if any)
- Medications (antiplatelet, anticoagulation)

OUTPUT FORMAT:
{
  "procedure_type": "DIAGNOSTIC_ANGIOGRAM|PCI_INTERVENTION|COMBINED",
  "missing_diagnostic": ["list of missing diagnostic elements"],
  "missing_intervention": ["list of missing intervention elements"],
  "completeness_score": "percentage of expected information provided"
}`
};
const ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE = {
  // Combined vessel anatomy from both agents
  coronarySegments: {
    // Left Main
    "LM": "Left Main Coronary Artery",
    // Left Anterior Descending System
    "LAD-1": "Proximal LAD (ostium to first major side branch)",
    "LAD-2": "Mid LAD (first major side branch to second major side branch)",
    "LAD-3": "Distal LAD (second major side branch to apex)",
    "D1": "First Diagonal Branch",
    "D2": "Second Diagonal Branch",
    "S1": "First Septal Perforator",
    "S2": "Second Septal Perforator",
    // Left Circumflex System  
    "LCx-1": "Proximal LCx (ostium to first obtuse marginal)",
    "LCx-2": "Mid LCx (first OM to second OM)",
    "LCx-3": "Distal LCx (second OM to terminus)",
    "OM1": "First Obtuse Marginal",
    "OM2": "Second Obtuse Marginal",
    "OM3": "Third Obtuse Marginal",
    "LPL": "Left Posterolateral Branch",
    "LPDA": "Left Posterior Descending Artery",
    // Right Coronary Artery System
    "RCA-1": "Proximal RCA (ostium to first right ventricular branch)",
    "RCA-2": "Mid RCA (first RV branch to acute marginal)",
    "RCA-3": "Distal RCA (acute marginal to crux)",
    "AM": "Acute Marginal Branch",
    "PDA": "Posterior Descending Artery",
    "RPL": "Right Posterolateral Branch",
    "RPDA": "Right Posterior Descending Artery",
    // Ramus Intermedius
    "RI": "Ramus Intermedius (when present)"
  },
  // Stenosis severity grading
  stenosisGrading: {
    "normal": "0-29% - Normal or minimal plaque",
    "mild": "30-49% - Mild stenosis",
    "moderate": "50-69% - Moderate stenosis",
    "severe": "70-89% - Severe stenosis",
    "critical": "90-99% - Critical stenosis",
    "total": "100% - Total occlusion"
  },
  // TIMI flow grades
  timiFlow: {
    "0": "TIMI 0 - No perfusion beyond occlusion",
    "I": "TIMI I - Penetration without perfusion",
    "II": "TIMI II - Partial perfusion with delayed flow",
    "III": "TIMI III - Complete perfusion with normal flow"
  },
  // PCI-specific stent knowledge
  stentTypes: {
    "DES": "Drug-Eluting Stent",
    "BMS": "Bare Metal Stent",
    "BVS": "Bioresorbable Vascular Scaffold",
    "DCS": "Drug-Coated Stent"
  },
  stentManufacturers: {
    "Abbott": ["Xience Xpedition", "Xience Sierra", "Xience Alpine", "Absorb"],
    "Boston Scientific": ["Synergy", "Promus Premier", "Rebel", "Agent"],
    "Medtronic": ["Resolute Onyx", "Resolute Integrity", "Resolute"],
    "Terumo": ["Ultimaster", "Nobori"],
    "Biotronik": ["Orsiro", "Alex Plus"],
    "MicroPort": ["Firehawk", "BuMA Supreme"],
    "B.Braun": ["Coroflex ISAR", "Coroflex Please"]
  },
  // Intervention techniques
  interventionTypes: {
    "PTCA": "Percutaneous Transluminal Coronary Angioplasty",
    "Stenting": "Coronary Stent Implantation",
    "ROTA": "Rotational Atherectomy",
    "DCA": "Directional Coronary Atherectomy",
    "Thrombectomy": "Aspiration or Mechanical Thrombectomy",
    "Cutting Balloon": "Cutting Balloon Angioplasty",
    "DCB": "Drug-Coated Balloon",
    "IVUS": "Intravascular Ultrasound Guidance",
    "OCT": "Optical Coherence Tomography Guidance",
    "FFR": "Fractional Flow Reserve Assessment"
  },
  // Access sites and approaches
  accessSites: {
    "right_radial": "Right radial artery access",
    "left_radial": "Left radial artery access",
    "right_femoral": "Right common femoral artery access",
    "left_femoral": "Left common femoral artery access",
    "brachial": "Brachial artery access",
    "ulnar": "Ulnar artery access"
  },
  // Hemodynamic normal values
  hemodynamicNormals: {
    "aortic_systolic": "100-140 mmHg",
    "aortic_diastolic": "60-90 mmHg",
    "lvedp": "<12 mmHg (normal), 12-15 mmHg (borderline), >15 mmHg (elevated)",
    "heart_rate": "60-100 bpm",
    "cardiac_output": "4-8 L/min",
    "cardiac_index": "2.5-4.0 L/min/m²",
    "FFR": "Normal >0.80, Abnormal ≤0.80"
  },
  // Complications (combined from both agents)
  complications: {
    "access_site": {
      "hematoma": "Access site hematoma",
      "pseudoaneurysm": "Pseudoaneurysm formation",
      "dissection": "Access vessel dissection"
    },
    "coronary": {
      "dissection": "Coronary artery dissection requiring management",
      "perforation": "Coronary perforation with potential pericardial effusion",
      "no_reflow": "No-reflow phenomenon requiring pharmacological intervention",
      "spasm": "Coronary artery spasm",
      "side_branch_occlusion": "Side branch occlusion requiring assessment"
    },
    "systemic": {
      "contrast_nephropathy": "Contrast-induced nephropathy risk",
      "allergic_reaction": "Contrast allergic reaction",
      "arrhythmia": "Periprocedural arrhythmia"
    }
  },
  // Comprehensive terminology corrections
  terminologyCorrections: {
    "left anterior descending": "LAD",
    "left circumflex": "LCx",
    "right coronary artery": "RCA",
    "left main": "LM",
    "percutaneous coronary intervention": "PCI",
    "percutaneous transluminal coronary angioplasty": "PTCA",
    "drug eluting stent": "DES",
    "bare metal stent": "BMS",
    "thrombolysis in myocardial infarction": "TIMI",
    "fractional flow reserve": "FFR",
    "intravascular ultrasound": "IVUS",
    "optical coherence tomography": "OCT",
    "millimeters of mercury": "mmHg",
    "french": "Fr"
  }
};
class AngiogramPCIAgent extends MedicalAgent {
  constructor() {
    super(
      "Angiogram/PCI Agent",
      "Interventional Cardiology",
      "Unified agent for cardiac catheterization: diagnostic angiography, PCI interventions, and combined procedures",
      "angiogram-pci",
      ANGIOGRAM_PCI_SYSTEM_PROMPTS.primary
    );
    __publicField(this, "lmStudioService");
    // Combined medical knowledge from both specialties
    __publicField(this, "vesselSegments", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.coronarySegments);
    __publicField(this, "stenosisGrading", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.stenosisGrading);
    __publicField(this, "timiFlow", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.timiFlow);
    __publicField(this, "stentTypes", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.stentTypes);
    __publicField(this, "stentManufacturers", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.stentManufacturers);
    __publicField(this, "interventionTypes", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.interventionTypes);
    __publicField(this, "accessSites", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.accessSites);
    __publicField(this, "complications", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.complications);
    __publicField(this, "hemodynamicNormals", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.hemodynamicNormals);
    __publicField(this, "terminologyCorrections", ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.terminologyCorrections);
    this.lmStudioService = LMStudioService.getInstance();
  }
  async process(input, context) {
    const startTime = Date.now();
    try {
      this.updateMemory("currentInput", input);
      this.updateMemory("processingContext", context);
      const procedureType = await this.detectProcedureType(input);
      console.log(`🔍 Detected procedure type: ${procedureType}`);
      this.updateMemory("detectedProcedureType", procedureType);
      const correctedInput = this.correctTerminology(input);
      const procedureData = this.extractProcedureData(correctedInput, procedureType);
      const missingInfo = await this.detectMissingInformation(correctedInput, procedureType);
      const reportContent = await this.generateStructuredReport(correctedInput, procedureData, procedureType);
      const sections = this.parseResponse(reportContent, context);
      const processingTime = Date.now() - startTime;
      const report = this.createReport(
        reportContent,
        sections,
        context,
        processingTime,
        0.95
      );
      if (missingInfo) {
        report.metadata.missingInformation = missingInfo;
      }
      report.metadata.medicalCodes = this.generateMedicalCodes(procedureData, procedureType);
      this.addProcedureMemory(
        procedureType === "DIAGNOSTIC_ANGIOGRAM" ? "Angiogram" : "PCI",
        {
          procedureType,
          indication: procedureData.indication,
          findings: procedureData.vesselFindings,
          intervention: "interventionDetails" in procedureData ? procedureData.interventionDetails : void 0,
          outcome: procedureData.proceduralOutcome
        },
        procedureData.proceduralOutcome
      );
      return report;
    } catch (error) {
      console.error("AngiogramPCI processing error:", error);
      const processingTime = Date.now() - startTime;
      return this.createReport(
        `Cardiac catheterization processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
        [],
        context,
        processingTime,
        0.1
      );
    }
  }
  /**
   * Intelligently detect procedure type from dictation content
   */
  async detectProcedureType(input) {
    try {
      const detectionPrompt = `${ANGIOGRAM_PCI_SYSTEM_PROMPTS.procedureDetection}

DICTATION TO ANALYZE:
${input}`;
      const response = await this.lmStudioService.processWithAgent(detectionPrompt, input);
      const cleanResponse = response.trim().toUpperCase();
      if (cleanResponse.includes("DIAGNOSTIC_ANGIOGRAM")) {
        return "DIAGNOSTIC_ANGIOGRAM";
      } else if (cleanResponse.includes("PCI_INTERVENTION")) {
        return "PCI_INTERVENTION";
      } else if (cleanResponse.includes("COMBINED")) {
        return "COMBINED";
      }
      return this.fallbackProcedureDetection(input);
    } catch (error) {
      console.error("❌ Error in procedure type detection:", error);
      return this.fallbackProcedureDetection(input);
    }
  }
  /**
   * Fallback procedure detection using keyword analysis
   */
  fallbackProcedureDetection(input) {
    const text = input.toLowerCase();
    const interventionKeywords = [
      "stent",
      "ptca",
      "balloon",
      "angioplasty",
      "intervention",
      "deployed",
      "implanted",
      "inflated",
      "device",
      "wire"
    ];
    const diagnosticKeywords = [
      "findings",
      "assessment",
      "stenosis",
      "vessel",
      "artery",
      "coronary",
      "catheterization",
      "angiography"
    ];
    const hasIntervention = interventionKeywords.some((keyword) => text.includes(keyword));
    const hasDiagnostic = diagnosticKeywords.some((keyword) => text.includes(keyword));
    if (hasIntervention && hasDiagnostic) {
      return "COMBINED";
    } else if (hasIntervention) {
      return "PCI_INTERVENTION";
    } else {
      return "DIAGNOSTIC_ANGIOGRAM";
    }
  }
  buildMessages(input, _context) {
    const procedureType = this.getMemory().shortTerm["detectedProcedureType"] || "DIAGNOSTIC_ANGIOGRAM";
    let contextualSystemPrompt = this.systemPrompt;
    if (procedureType === "DIAGNOSTIC_ANGIOGRAM") {
      contextualSystemPrompt += "\n\nFORMAT: Use the concise 3-section diagnostic angiogram format (PREAMBLE, FINDINGS, CONCLUSION).";
    } else if (procedureType === "PCI_INTERVENTION") {
      contextualSystemPrompt += "\n\nFORMAT: Use the comprehensive PCI procedural report format with all intervention sections.";
    } else {
      contextualSystemPrompt += "\n\nFORMAT: Use comprehensive format covering both diagnostic findings and intervention details.";
    }
    const userPrompt = `Generate a ${procedureType.toLowerCase().replace("_", " ")} report using the appropriate format.

Dictation to process:
${input}

Use the clinician's exact terminology as provided. Include all relevant details while maintaining clinical accuracy and proper medical terminology.`;
    return [
      { role: "system", content: contextualSystemPrompt },
      { role: "user", content: userPrompt }
    ];
  }
  parseResponse(response, _context) {
    const procedureType = this.getMemory().shortTerm["detectedProcedureType"] || "DIAGNOSTIC_ANGIOGRAM";
    const sections = [];
    const lines = response.split("\n");
    let currentSection = null;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      if (this.isSectionHeader(trimmedLine, procedureType)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: this.cleanSectionTitle(trimmedLine),
          content: "",
          type: "structured",
          priority: this.getSectionPriority(trimmedLine, procedureType)
        };
      } else if (currentSection) {
        currentSection.content += (currentSection.content ? "\n" : "") + trimmedLine;
      } else if (trimmedLine && !currentSection) {
        const defaultTitle = procedureType === "DIAGNOSTIC_ANGIOGRAM" ? "Angiogram Report" : "Cardiac Catheterization Report";
        currentSection = {
          title: defaultTitle,
          content: trimmedLine,
          type: "structured",
          priority: "high"
        };
      }
    }
    if (currentSection) {
      sections.push(currentSection);
    }
    return sections;
  }
  correctTerminology(text) {
    let correctedText = text;
    for (const [incorrect, correct] of Object.entries(this.terminologyCorrections)) {
      const regex = new RegExp(incorrect, "gi");
      correctedText = correctedText.replace(regex, correct);
    }
    return correctedText;
  }
  extractProcedureData(input, procedureType) {
    const baseData = {
      indication: this.extractIndication(input),
      accessSite: this.extractAccessSite(input),
      vesselFindings: this.extractVesselFindings(input),
      hemodynamics: this.extractHemodynamics(input),
      complications: this.extractComplications(input),
      proceduralOutcome: this.extractProceduralOutcome(input),
      contrastVolume: this.extractContrastVolume(input),
      fluoroscopyTime: this.extractFluoroscopyTime(input)
    };
    if (procedureType === "PCI_INTERVENTION" || procedureType === "COMBINED") {
      return {
        ...baseData,
        interventionDetails: {
          targetVessel: this.extractTargetVessel(input),
          lesionCharacteristics: this.extractLesionCharacteristics(input),
          interventionType: this.extractInterventionType(input),
          stentDetails: this.extractStentDetails(input),
          angiographicResult: this.extractAngiographicResult(input),
          medications: this.extractMedications(input)
        }
      };
    }
    return baseData;
  }
  async generateStructuredReport(input, procedureData, procedureType) {
    console.log(`🏥 Generating ${procedureType} report with LMStudio medgemma-27b...`);
    try {
      const contextualSystemPrompt = this.systemPrompt + (procedureType === "DIAGNOSTIC_ANGIOGRAM" ? "\n\nFORMAT: Use the concise 3-section diagnostic angiogram format (PREAMBLE, FINDINGS, CONCLUSION)." : "\n\nFORMAT: Use the comprehensive PCI procedural report format with all intervention sections.");
      const report = await this.lmStudioService.processWithAgent(contextualSystemPrompt, input);
      console.log("✅ Report generated successfully");
      console.log("📄 Report length:", report.length, "characters");
      return report;
    } catch (error) {
      console.error("❌ Error generating report:", error);
      return this.generateFallbackReport(input, procedureData, procedureType);
    }
  }
  generateFallbackReport(input, procedureData, procedureType) {
    if (procedureType === "DIAGNOSTIC_ANGIOGRAM") {
      return `**PREAMBLE**
Coronary angiography performed. [Procedural details not specified in dictation]

**FINDINGS**
Left Main: ${this.describeLMFindings(procedureData) || "[Not specified in dictation]"}
Left Anterior Descending: ${this.describeLADFindings(procedureData) || "[Not specified in dictation]"}
Circumflex: ${this.describeLCxFindings(procedureData) || "[Not specified in dictation]"}
Right Coronary Artery: ${this.describeRCAFindings(procedureData) || "[Not specified in dictation]"}
Left ventricle and valves: ${procedureData.hemodynamics || "[Not specified in dictation]"}

**CONCLUSION**
${procedureData.proceduralOutcome || "Coronary angiography completed. Clinical correlation recommended."}

Note: This report was generated with limited AI processing due to technical issues.`;
    } else {
      return `**PROCEDURE PERFORMED**: Percutaneous Coronary Intervention (PCI)

**INDICATION**: ${procedureData.indication || "[Not specified in dictation]"}

**PROCEDURE**: 
- Access: ${procedureData.accessSite || "[Not specified]"}
- Target Vessel: ${procedureData.interventionDetails?.targetVessel || "[Not specified]"}
- Intervention: ${procedureData.interventionDetails?.interventionType || "[Not specified]"}

**OUTCOME**: 
- Complications: ${procedureData.complications.length > 0 ? procedureData.complications.join(", ") : "[None specified]"}
- Result: ${procedureData.interventionDetails?.angiographicResult || "[Not specified in dictation]"}

**MEDICATIONS**: ${procedureData.interventionDetails?.medications || "[Not specified in dictation]"}

Note: This report was generated with limited AI processing due to technical issues.`;
    }
  }
  async detectMissingInformation(input, procedureType) {
    try {
      const missingInfoPrompt = `${ANGIOGRAM_PCI_SYSTEM_PROMPTS.missingInfoDetection}

DICTATION TO ANALYZE:
${input}`;
      const response = await this.lmStudioService.processWithAgent(missingInfoPrompt, input);
      try {
        const missingInfo = JSON.parse(response.replace(/```json|```/g, "").trim());
        return missingInfo;
      } catch (parseError) {
        return this.fallbackMissingInfoDetection(input, procedureType);
      }
    } catch (error) {
      console.error("❌ Error detecting missing information:", error);
      return this.fallbackMissingInfoDetection(input, procedureType);
    }
  }
  fallbackMissingInfoDetection(input, procedureType) {
    const text = input.toLowerCase();
    const missing = {
      procedure_type: procedureType,
      missing_diagnostic: [],
      missing_intervention: [],
      completeness_score: "75%"
    };
    if (!text.includes("left main") && !text.includes("lm ")) {
      missing.missing_diagnostic.push("Left Main coronary artery");
    }
    if (!text.includes("lad") && !text.includes("left anterior descending")) {
      missing.missing_diagnostic.push("Left Anterior Descending artery");
    }
    if (procedureType === "PCI_INTERVENTION" || procedureType === "COMBINED") {
      if (!text.includes("stent") && !text.includes("balloon")) {
        missing.missing_intervention.push("Device specifications");
      }
      if (!text.includes("timi")) {
        missing.missing_intervention.push("TIMI flow assessment");
      }
    }
    return missing;
  }
  generateMedicalCodes(procedureData, procedureType) {
    const codes = [];
    if (procedureType === "DIAGNOSTIC_ANGIOGRAM") {
      codes.push({
        system: "CPT",
        code: "93458",
        description: "Catheter placement in coronary arteries for coronary angiography"
      });
    } else {
      codes.push({
        system: "CPT",
        code: "92928",
        description: "Percutaneous transcatheter placement of intracoronary stent(s)"
      });
    }
    if (procedureData.proceduralOutcome?.includes("normal")) {
      codes.push({
        system: "ICD-10",
        code: "Z87.891",
        description: "Personal history of cardiac catheterization"
      });
    } else {
      codes.push({
        system: "ICD-10",
        code: "I25.10",
        description: "Atherosclerotic heart disease of native coronary artery without angina pectoris"
      });
    }
    return codes;
  }
  // Helper methods for data extraction (simplified versions combining both agent approaches)
  extractIndication(input) {
    const indicationPatterns = [
      /indication[:\s]+([^.]+)/i,
      /referred\s+for\s+([^.]+)/i,
      /(?:chest pain|angina|dyspnoea|shortness of breath|stemi|nstemi)/i
    ];
    for (const pattern of indicationPatterns) {
      const match = input.match(pattern);
      if (match) return match[1]?.trim() || match[0];
    }
    return "Coronary artery assessment";
  }
  extractAccessSite(input) {
    const text = input.toLowerCase();
    for (const [key, description] of Object.entries(this.accessSites)) {
      if (text.includes(key.replace("_", " "))) {
        return description;
      }
    }
    return "Radial artery access";
  }
  extractVesselFindings(input) {
    const findings = {};
    const vessels = ["lm", "lad", "lcx", "rca"];
    for (const vessel of vessels) {
      const vesselPattern = new RegExp(`${vessel}[\\s:]+([^.]+)`, "i");
      const match = input.match(vesselPattern);
      if (match) {
        findings[vessel] = match[1].trim();
      }
    }
    return findings;
  }
  extractHemodynamics(input) {
    const measurements = [];
    const aorticMatch = input.match(/aortic[:\s]+(\d+)\/(\d+)\s*mmhg/i);
    if (aorticMatch) {
      measurements.push(`Aortic pressure ${aorticMatch[1]}/${aorticMatch[2]} mmHg`);
    }
    const lvedpMatch = input.match(/lvedp[:\s]+(\d+)\s*mmhg/i);
    if (lvedpMatch) {
      measurements.push(`LVEDP ${lvedpMatch[1]} mmHg`);
    }
    return measurements.length > 0 ? measurements.join(", ") : "[Hemodynamic parameters not specified]";
  }
  extractComplications(input) {
    const text = input.toLowerCase();
    const foundComplications = [];
    if (text.includes("hematoma")) foundComplications.push("Access site hematoma");
    if (text.includes("dissection")) foundComplications.push("Arterial dissection");
    if (text.includes("perforation")) foundComplications.push("Vessel perforation");
    if (text.includes("spasm")) foundComplications.push("Coronary spasm");
    return foundComplications;
  }
  extractProceduralOutcome(input) {
    const text = input.toLowerCase();
    if (text.includes("successful") || text.includes("completed without")) {
      return "Procedure completed successfully";
    } else if (text.includes("complicated")) {
      return "Procedure completed with complications as noted";
    }
    return "Cardiac catheterization completed";
  }
  extractContrastVolume(input) {
    const match = input.match(/(\d+)\s*(?:ml|mls|cc)\s*(?:of\s*)?contrast/i);
    return match ? `${match[1]} mL contrast` : "";
  }
  extractFluoroscopyTime(input) {
    const match = input.match(/(?:fluoroscopy|fluoro)\s*(?:time[:\s]*)?(\d+)\s*(?:min|minutes)/i);
    return match ? `${match[1]} minutes fluoroscopy time` : "";
  }
  // PCI-specific extraction methods
  extractTargetVessel(input) {
    const text = input.toLowerCase();
    const vessels = Object.keys(this.vesselSegments);
    for (const vessel of vessels) {
      if (text.includes(vessel.toLowerCase()) && vessel in this.vesselSegments) {
        return this.vesselSegments[vessel];
      }
    }
    return "Coronary vessel";
  }
  extractLesionCharacteristics(input) {
    const characteristics = [];
    const text = input.toLowerCase();
    if (text.includes("severe")) characteristics.push("severe stenosis");
    if (text.includes("calcif")) characteristics.push("calcified");
    if (text.includes("total occlusion") || text.includes("cto")) characteristics.push("chronic total occlusion");
    const stenosisMatch = text.match(/(\d+)%?\s*stenosis/);
    if (stenosisMatch) {
      characteristics.push(`${stenosisMatch[1]}% stenosis`);
    }
    return characteristics.length > 0 ? characteristics.join(", ") : "coronary stenosis";
  }
  extractInterventionType(input) {
    const text = input.toLowerCase();
    for (const [key, description] of Object.entries(this.interventionTypes)) {
      if (text.includes(key.toLowerCase())) {
        return description;
      }
    }
    return "Percutaneous Coronary Intervention";
  }
  extractStentDetails(input) {
    const text = input.toLowerCase();
    const details = [];
    for (const [key, type] of Object.entries(this.stentTypes)) {
      if (text.includes(key.toLowerCase())) {
        details.push(type);
        break;
      }
    }
    const sizeMatch = text.match(/(\d+\.?\d*)\s*(?:×|x|by)\s*(\d+)\s*mm/);
    if (sizeMatch) {
      details.push(`${sizeMatch[1]}×${sizeMatch[2]}mm`);
    }
    return details.length > 0 ? details.join(" ") : "coronary stent";
  }
  extractAngiographicResult(input) {
    const text = input.toLowerCase();
    if (text.includes("timi 3") || text.includes("timi iii")) return "TIMI III flow achieved";
    if (text.includes("timi 2") || text.includes("timi ii")) return "TIMI II flow";
    if (text.includes("excellent") || text.includes("optimal")) return "Excellent angiographic result";
    return "Satisfactory angiographic result";
  }
  extractMedications(input) {
    const medications = [];
    const text = input.toLowerCase();
    if (text.includes("aspirin")) medications.push("Aspirin");
    if (text.includes("clopidogrel") || text.includes("plavix")) medications.push("Clopidogrel");
    if (text.includes("ticagrelor")) medications.push("Ticagrelor");
    if (text.includes("heparin")) medications.push("Heparin anticoagulation");
    return medications.length > 0 ? medications.join(", ") : "[Medications not specified]";
  }
  // Section parsing helpers
  isSectionHeader(line, procedureType) {
    if (procedureType === "DIAGNOSTIC_ANGIOGRAM") {
      const normalizedLine = line.toLowerCase().replace(/\*/g, "").trim();
      return normalizedLine === "preamble" || normalizedLine === "findings" || normalizedLine === "conclusion" || line.startsWith("**") && line.endsWith("**");
    } else {
      return line.startsWith("**") && line.endsWith("**") || line.toUpperCase() === line && line.length > 3;
    }
  }
  getSectionPriority(line, _procedureType) {
    const highPriority = [
      "preamble",
      "findings",
      "conclusion",
      "procedure",
      "indication",
      "complications",
      "assessment",
      "device",
      "angiographic",
      "hemodynamic"
    ];
    const title = line.toLowerCase();
    for (const keyword of highPriority) {
      if (title.includes(keyword)) return "high";
    }
    return "medium";
  }
  cleanSectionTitle(line) {
    return line.replace(/\*\*/g, "").replace(/:/g, "").trim();
  }
  // Helper methods for vessel findings display
  describeLMFindings(procedureData) {
    return procedureData.vesselFindings?.lm || "[Left main findings not specified in dictation]";
  }
  describeLADFindings(procedureData) {
    return procedureData.vesselFindings?.lad || "[LAD findings not specified in dictation]";
  }
  describeLCxFindings(procedureData) {
    return procedureData.vesselFindings?.lcx || "[LCx findings not specified in dictation]";
  }
  describeRCAFindings(procedureData) {
    return procedureData.vesselFindings?.rca || "[RCA findings not specified in dictation]";
  }
}
const AngiogramPCIAgent$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AngiogramPCIAgent
}, Symbol.toStringTag, { value: "Module" }));
class NarrativeLetterAgent extends MedicalAgent {
  constructor(name, specialty, description, agentType) {
    const narrativeSystemPrompt = `You are a specialist physician creating narrative medical correspondence for referring doctors in Australian healthcare context.

CRITICAL REQUIREMENTS:
- Generate CLEAN PROSE PARAGRAPHS ONLY - no headings, no section headers, no bullet points
- NO salutation (Dear...) and NO sign-off (Kind regards...)
- Write continuous narrative paragraphs in first-person voice
- Re-order content to classic medical flow: History → Assessment → Recommendations/Plan
- Strip all filler words (um, uh, you know, etc.) and false starts
- Keep professional first-person voice (I examined, I found, I recommend)

TEXT FORMATTING RULES:
- Convert all numbers to digits with units: "10 mg", "65 years old", "3 months"
- Medication format: "atorvastatin 20 mg daily", "metformin 500 mg twice daily"
- Use Australian spelling: recognise, optimise, centre, favour, colour
- Use Australian units and terminology where appropriate

CONTENT ORGANISATION (without headings):
- Start with clinical presentation and relevant history
- Follow with examination findings and investigations
- Conclude with assessment and management recommendations
- Maintain logical paragraph flow throughout

QUALITY REQUIREMENTS:
- Minimum 50 words for coherent narrative
- Professional medical language appropriate for colleague communication
- Clear clinical reasoning without excessive technical jargon
- Specific medication names, doses, and timeframes where mentioned

Generate coherent narrative prose suitable for medical correspondence between colleagues.`;
    super(name, specialty, description, agentType, narrativeSystemPrompt);
    __publicField(this, "lmStudioService");
    this.lmStudioService = LMStudioService.getInstance();
  }
  async process(input, context) {
    const startTime = Date.now();
    try {
      console.log(`🩺 ${this.name} processing narrative letter...`);
      const rawContent = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        input
      );
      const cleanedContent = this.cleanNarrativeText(rawContent);
      const hasHallucination = this.detectHallucination(input, cleanedContent);
      const warnings = hasHallucination ? ["Output may contain material not present in original dictation. Please review carefully."] : [];
      const confidence = this.calculateNarrativeConfidence(input, cleanedContent);
      const validation = this.validateAndFormatContent(cleanedContent, input, confidence);
      const errors = [];
      if (validation.hasError && validation.errorMessage) {
        errors.push(validation.errorMessage);
      }
      const processingTime = Date.now() - startTime;
      console.log(`✅ ${this.name} completed in ${processingTime}ms`);
      return this.createReport(
        validation.content,
        [],
        // Narrative agents don't have sections
        context,
        processingTime,
        confidence,
        warnings,
        errors
      );
    } catch (error) {
      console.error(`❌ ${this.name} processing error:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown processing error";
      const truncatedInput = input.substring(0, 100);
      const fallbackContent = `${truncatedInput}${input.length > 100 ? "..." : ""}`;
      return this.createReport(
        fallbackContent,
        [],
        context,
        Date.now() - startTime,
        0.1,
        [],
        // no warnings
        [`Processing failed: ${errorMessage}`]
        // structured error
      );
    }
  }
  buildMessages(input, _context) {
    return [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: input }
    ];
  }
  parseResponse(_response, _context) {
    return [];
  }
  /**
   * Clean and normalize narrative text according to functional rules
   */
  cleanNarrativeText(text) {
    let cleaned = text;
    cleaned = cleaned.replace(/^(Dear\s+[^,\n]+,?\s*)/gmi, "");
    cleaned = cleaned.replace(/(Kind\s+regards|Yours\s+sincerely|Thank\s+you|Best\s+wishes)[^]*$/gmi, "");
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "");
    cleaned = cleaned.replace(/^#+\s+.*/gm, "");
    cleaned = cleaned.replace(/^[-=]{2,}$/gm, "");
    cleaned = cleaned.replace(/\b(um|uh|er|you know|like|I mean|actually|basically|sort of|kind of)\b/gi, "");
    cleaned = cleaned.replace(/\b(\w+)\s+\.\.\.\s+\1\b/gi, "$1");
    cleaned = cleaned.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(mg|mcg|g|ml|l|mmol\/l|mmhg|units?|years?|months?|weeks?|days?|hours?)\b/gi, (match, num, unit) => {
      const numbers = {
        "one": "1",
        "two": "2",
        "three": "3",
        "four": "4",
        "five": "5",
        "six": "6",
        "seven": "7",
        "eight": "8",
        "nine": "9",
        "ten": "10"
      };
      return `${numbers[num.toLowerCase()]} ${unit}`;
    });
    cleaned = cleaned.replace(
      /(\b[a-z]+(?:pril|sartan|olol|dipine|statin|gliflozin|glutide|mab|ban|nitr(?:ate|ite)|darone|parin|cillin|azole)\b)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g)\s+(daily|once daily|twice daily|bd|od|tds)\b/gi,
      "$1 $2 $3 $4"
    );
    const australianSpelling = {
      "recognize": "recognise",
      "optimize": "optimise",
      "center": "centre",
      "favor": "favour",
      "color": "colour",
      "organize": "organise",
      "realize": "realise",
      "analyze": "analyse",
      "defense": "defence"
    };
    for (const [american, australian] of Object.entries(australianSpelling)) {
      const regex = new RegExp(`\\b${american}\\b`, "gi");
      cleaned = cleaned.replace(regex, australian);
    }
    cleaned = cleaned.replace(/\s+/g, " ");
    cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, "$1 $2");
    cleaned = cleaned.trim();
    return cleaned;
  }
  /**
   * Detect hallucinated content by counting novel tokens (>3 chars)
   * that never appeared in the original dictation. Threshold = 15.
   */
  detectHallucination(source, generated) {
    const src = new Set(source.toLowerCase().match(/\b[a-z0-9]+\b/g) || []);
    const gen = generated.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    let novel = 0;
    for (const tok of gen) {
      if (tok.length > 3 && !src.has(tok)) {
        novel++;
        if (novel > 15) return true;
      }
    }
    return false;
  }
  /**
   * Calculate confidence based on text length and language quality
   * (not section detection like structured agents)
   */
  calculateNarrativeConfidence(input, output) {
    let confidence = 0.5;
    if (input.length > 100) confidence += 0.1;
    if (input.length > 300) confidence += 0.1;
    if (input.length > 600) confidence += 0.1;
    if (output.length > 50) confidence += 0.1;
    if (output.length > 150) confidence += 0.1;
    const medicalTerms = /\b(patient|history|examination|assessment|recommend|medication|condition|treatment|follow.?up)\b/gi;
    const medicalMatches = (output.match(medicalTerms) || []).length;
    if (medicalMatches > 3) confidence += 0.1;
    if (medicalMatches > 6) confidence += 0.1;
    const sentences = output.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length > 2) confidence += 0.1;
    if (sentences.length > 4) confidence += 0.1;
    if (output.includes("**") || output.includes("##")) confidence -= 0.2;
    if (output.toLowerCase().includes("dear ") || output.toLowerCase().includes("kind regards")) confidence -= 0.2;
    return Math.min(Math.max(confidence, 0.1), 1);
  }
  /**
   * Validate content meets minimum requirements and format appropriately
   */
  validateAndFormatContent(content, originalInput, confidence) {
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount < 50 || confidence < 0.3) {
      const truncatedInput = originalInput.substring(0, 100);
      return {
        content: `${truncatedInput}${originalInput.length > 100 ? "..." : ""}`,
        hasError: true,
        errorMessage: "Dictation could not be parsed coherently due to insufficient content or low confidence."
      };
    }
    return {
      content,
      hasError: false
    };
  }
}
class QuickLetterAgent extends NarrativeLetterAgent {
  constructor() {
    super(
      "Quick Letter Agent",
      "Medical Correspondence",
      "Generates clean narrative prose for dictated medical letters and brief correspondence",
      "quick-letter"
    );
    // Comprehensive medical terminology for Australian cardiology context
    __publicField(this, "medicationCategories", {
      "cardiac": [
        // Antiplatelet agents
        "aspirin",
        "clopidogrel",
        "ticagrelor",
        "prasugrel",
        // Anticoagulants
        "warfarin",
        "rivaroxaban",
        "apixaban",
        "dabigatran",
        "enoxaparin",
        // ACE inhibitors/ARBs
        "perindopril",
        "ramipril",
        "lisinopril",
        "candesartan",
        "irbesartan",
        "telmisartan",
        // Beta-blockers
        "metoprolol",
        "bisoprolol",
        "carvedilol",
        "atenolol",
        "nebivolol",
        // Calcium channel blockers
        "amlodipine",
        "diltiazem",
        "verapamil",
        "felodipine",
        "lercanidipine",
        // Diuretics
        "frusemide",
        "indapamide",
        "hydrochlorothiazide",
        "spironolactone",
        "eplerenone",
        "amiloride",
        // Statins
        "atorvastatin",
        "simvastatin",
        "rosuvastatin",
        "pravastatin",
        // Anti-arrhythmics
        "amiodarone",
        "sotalol",
        "flecainide",
        "digoxin",
        // Heart‑failure & vasodilators
        "sacubitril-valsartan",
        "ivabradine",
        "vericiguat",
        "glyceryl trinitrate",
        "isosorbide mononitrate",
        "isosorbide dinitrate",
        "nicorandil",
        "hydralazine",
        // Advanced lipid‑lowering
        "evolocumab",
        "alirocumab",
        "inclisiran",
        // Additional anti‑arrhythmics
        "dofetilide",
        "propafenone",
        "disopyramide",
        // Pulmonary‑HTN / HF adjuncts
        "macitentan",
        "sildenafil",
        "tadalafil",
        "ambrisentan",
        "riociguat"
      ],
      "diabetes": [
        "metformin",
        "gliclazide",
        "glimepiride",
        "insulin",
        "empagliflozin",
        "dapagliflozin",
        "sitagliptin",
        "linagliptin",
        "dulaglutide",
        "semaglutide"
      ],
      "respiratory": [
        "salbutamol",
        "tiotropium",
        "budesonide",
        "prednisolone",
        "formoterol",
        "salmeterol",
        "ipratropium",
        "montelukast"
      ],
      "pain": [
        "paracetamol",
        "ibuprofen",
        "tramadol",
        "morphine",
        "oxycodone",
        "celecoxib",
        "diclofenac",
        "naproxen"
      ],
      "gastrointestinal": [
        "omeprazole",
        "esomeprazole",
        "pantoprazole",
        "lansoprazole",
        "ranitidine"
      ],
      "other": [
        "allopurinol",
        "colchicine",
        "levothyroxine",
        "vitamin_d",
        "calcium"
      ]
    });
  }
  /**
   * Simple heuristic to detect hallucinated content:
   * Counts tokens (>3 chars) that never appeared in the original dictation.
   * If >15 novel tokens are present, we flag it as hallucination.
   */
  detectHallucination(source, generated) {
    const srcTokens = new Set(source.toLowerCase().match(/\b[a-z0-9]+\b/g) || []);
    const genTokens = generated.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    let novel = 0;
    for (const tok of genTokens) {
      if (tok.length > 3 && !srcTokens.has(tok)) {
        novel++;
        if (novel > 15) return true;
      }
    }
    return false;
  }
  async process(input, context) {
    const extractedData = this.extractBasicLetterData(input);
    let contextualPrompt = this.systemPrompt;
    if (extractedData.letterType !== "general") {
      contextualPrompt += `

Detected context: This appears to be ${extractedData.letterType} correspondence. Focus on the relevant clinical content while maintaining continuous narrative prose format.`;
    }
    const tempSystemPrompt = this.systemPrompt;
    this.systemPrompt = contextualPrompt;
    try {
      const result = await super.process(input, context);
      const outputText = result.content ?? "";
      const parsedResult = this.parseStructuredResponse(outputText);
      if (this.detectHallucination(input, parsedResult.letterContent)) {
        this.systemPrompt = tempSystemPrompt;
        const warnings = result.warnings ? [...result.warnings] : [];
        warnings.push("Output may contain material not present in original dictation. Please review carefully.");
        return {
          ...result,
          content: parsedResult.letterContent,
          summary: parsedResult.summary,
          warnings
        };
      }
      this.systemPrompt = tempSystemPrompt;
      return {
        ...result,
        content: parsedResult.letterContent,
        summary: parsedResult.summary
      };
    } catch (error) {
      this.systemPrompt = tempSystemPrompt;
      throw error;
    }
  }
  /**
   * Parse structured response with SUMMARY: and LETTER: sections
   */
  parseStructuredResponse(outputText) {
    try {
      const summaryMatch = outputText.match(/SUMMARY:\s*(.+?)(?=---)/s);
      const letterMatch = outputText.match(/LETTER:\s*(.*)/s);
      if (summaryMatch && letterMatch) {
        const letterContent = letterMatch[1].trim();
        const intelligentSummary2 = this.generateIntelligentSummary(letterContent);
        const enhancedSummary = intelligentSummary2.length > 150 ? intelligentSummary2.substring(0, 147) + "..." : intelligentSummary2;
        return {
          summary: enhancedSummary,
          letterContent
        };
      }
      const intelligentSummary = this.generateIntelligentSummary(outputText);
      const fallbackSummary = intelligentSummary.length > 150 ? intelligentSummary.substring(0, 147) + "..." : intelligentSummary;
      return {
        summary: fallbackSummary,
        letterContent: outputText
      };
    } catch (error) {
      console.warn("Error parsing structured response:", error);
      const fallbackSummary = outputText.length > 150 ? outputText.substring(0, 147) + "..." : outputText;
      return {
        summary: fallbackSummary,
        letterContent: outputText
      };
    }
  }
  /**
   * Generate an intelligent clinical summary by analyzing the letter content
   * Focuses on key diagnoses, procedures, and actionable recommendations
   */
  generateIntelligentSummary(content) {
    const text = content.toLowerCase();
    const summaryComponents = [];
    const cardiacFindings = this.extractCardiacFindings(text);
    if (cardiacFindings.length > 0) {
      summaryComponents.push(cardiacFindings.join(" + "));
    }
    const otherFindings = this.extractOtherMedicalFindings(text);
    if (otherFindings.length > 0) {
      summaryComponents.push(...otherFindings);
    }
    const surgicalRecs = this.extractSurgicalRecommendations(text);
    if (surgicalRecs.length > 0) {
      summaryComponents.push(surgicalRecs.join("; "));
    }
    const medicationRecs = this.extractMedicationRecommendations(text);
    if (medicationRecs.length > 0) {
      summaryComponents.push(...medicationRecs);
    }
    const followUpPlans = this.extractFollowUpPlans(text);
    if (followUpPlans.length > 0) {
      summaryComponents.push(...followUpPlans);
    }
    const normalFindings = this.extractNormalFindings(text);
    if (normalFindings.length > 0) {
      summaryComponents.push(...normalFindings);
    }
    if (summaryComponents.length > 0) {
      let summary = summaryComponents.join(". ");
      summary = this.cleanUpSummary(summary);
      if (!summary.match(/[.!?]$/)) {
        summary += ".";
      }
      return summary;
    }
    return this.extractFallbackSummary(content);
  }
  /**
   * Extract cardiac conditions with severity qualifiers
   */
  extractCardiacFindings(text) {
    const findings = [];
    const valvePatterns = [
      { pattern: /\b(severe|moderate|mild)\s+(mitral\s+regurgitation|mr)\b/g, abbrev: (severity) => `${severity} MR` },
      { pattern: /\b(severe|moderate|mild)\s+(aortic\s+stenosis|as)\b/g, abbrev: (severity) => `${severity} AS` },
      { pattern: /\b(severe|moderate|mild)\s+(aortic\s+regurgitation|ar)\b/g, abbrev: (severity) => `${severity} AR` },
      { pattern: /\b(severe|moderate|mild)\s+(tricuspid\s+regurgitation|tr)\b/g, abbrev: (severity) => `${severity} TR` },
      { pattern: /\b(severe|moderate|mild)\s+(mitral\s+stenosis|ms)\b/g, abbrev: (severity) => `${severity} MS` }
    ];
    valvePatterns.forEach(({ pattern, abbrev }) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        findings.push(abbrev(match[1]));
      }
    });
    if (text.includes("severe") && (text.includes("left ventricular dysfunction") || text.includes("lv dysfunction"))) {
      findings.push("severe LV dysfunction");
    } else if (text.includes("moderate") && (text.includes("left ventricular dysfunction") || text.includes("lv dysfunction"))) {
      findings.push("moderate LV dysfunction");
    } else if (text.includes("mild") && (text.includes("left ventricular dysfunction") || text.includes("lv dysfunction"))) {
      findings.push("mild LV dysfunction");
    }
    if (text.includes("left ventricular aneurysm") || text.includes("lv aneurysm")) {
      findings.push("LV aneurysm");
    }
    if (text.includes("ventricular septal defect") || text.includes("vsd")) {
      findings.push("VSD");
    }
    if (text.includes("atrial septal defect") || text.includes("asd")) {
      findings.push("ASD");
    }
    return findings;
  }
  /**
   * Extract other important medical findings
   */
  extractOtherMedicalFindings(text) {
    const findings = [];
    if (text.includes("triple vessel disease") || text.includes("3 vessel disease")) {
      findings.push("Triple vessel CAD");
    } else if (text.includes("double vessel disease") || text.includes("2 vessel disease")) {
      findings.push("Double vessel CAD");
    } else if (text.includes("single vessel disease") || text.includes("1 vessel disease")) {
      findings.push("Single vessel CAD");
    } else if (text.includes("coronary artery disease") || text.includes("cad")) {
      findings.push("CAD");
    }
    if (text.includes("atrial fibrillation") || text.includes("af")) {
      findings.push("AF");
    }
    if (text.includes("ventricular tachycardia") || text.includes("vt")) {
      findings.push("VT");
    }
    if (text.includes("heart failure") || text.includes("hf")) {
      findings.push("Heart failure");
    }
    return findings;
  }
  /**
   * Extract surgical and procedural recommendations
   */
  extractSurgicalRecommendations(text) {
    const recommendations = [];
    if (text.includes("consideration of") && (text.includes("surgical repair") || text.includes("surgical replacement"))) {
      recommendations.push("for consideration of surgical repair or replacement");
    } else if (text.includes("surgical repair")) {
      recommendations.push("surgical repair recommended");
    } else if (text.includes("surgical replacement")) {
      recommendations.push("surgical replacement recommended");
    }
    if (text.includes("aneurysmectomy")) {
      recommendations.push("aneurysmectomy planned");
    }
    if (text.includes("mitral valve replacement") || text.includes("mvr")) {
      recommendations.push("MVR planned");
    }
    if (text.includes("aortic valve replacement") || text.includes("avr")) {
      recommendations.push("AVR planned");
    }
    if (text.includes("cabg") || text.includes("bypass")) {
      recommendations.push("CABG planned");
    }
    if (text.includes("pci") || text.includes("angioplasty")) {
      recommendations.push("PCI planned");
    }
    return recommendations;
  }
  /**
   * Extract medication recommendations
   */
  extractMedicationRecommendations(text) {
    const recommendations = [];
    if (text.includes("continue") && (text.includes("statin") || text.includes("rosuvastatin") || text.includes("atorvastatin"))) {
      if (text.includes("low dose")) {
        recommendations.push("Continue statin at low dose");
      } else {
        recommendations.push("Continue statin");
      }
    } else if (text.includes("start") && text.includes("statin")) {
      recommendations.push("Start statin therapy");
    }
    if (text.includes("continue") && (text.includes("warfarin") || text.includes("anticoagulation"))) {
      recommendations.push("Continue anticoagulation");
    } else if (text.includes("start") && text.includes("anticoagulation")) {
      recommendations.push("Start anticoagulation");
    }
    if (text.includes("continue") && (text.includes("ace inhibitor") || text.includes("perindopril") || text.includes("ramipril"))) {
      recommendations.push("Continue ACE inhibitor");
    }
    return recommendations;
  }
  /**
   * Extract follow-up and monitoring plans
   */
  extractFollowUpPlans(text) {
    const plans = [];
    if (text.includes("monitor") && text.includes("hypertension")) {
      if (text.includes("24 months") || text.includes("2 years")) {
        plans.push("Monitor for hypertension over next 24 months");
      } else {
        plans.push("Monitor for hypertension");
      }
    }
    if (text.includes("monitor") && text.includes("blood pressure")) {
      plans.push("Monitor blood pressure");
    }
    if (text.includes("echo") && (text.includes("follow up") || text.includes("repeat"))) {
      if (text.includes("6 months")) {
        plans.push("Repeat echo in 6 months");
      } else if (text.includes("12 months") || text.includes("1 year")) {
        plans.push("Repeat echo in 12 months");
      } else {
        plans.push("Echo follow-up");
      }
    }
    if (text.includes("ct scan") && text.includes("arrange")) {
      plans.push("CT scan planned");
    }
    return plans;
  }
  /**
   * Extract normal findings that provide reassurance
   */
  extractNormalFindings(text) {
    const findings = [];
    if (text.includes("normal coronary arteries") || text.includes("coronary arteries") && text.includes("normal")) {
      findings.push("No coronary disease");
    }
    if (text.includes("calcium score") && (text.includes("zero") || text.includes("0"))) {
      findings.push("Calcium score 0");
    }
    if (text.includes("normal") && (text.includes("ejection fraction") || text.includes("ef"))) {
      findings.push("Normal EF");
    }
    return findings;
  }
  /**
   * Clean up and format the summary
   */
  cleanUpSummary(summary) {
    return summary.replace(/\s+/g, " ").replace(/\.\s*\./g, ".").replace(/;\s*;/g, ";").replace(/,\s*,/g, ",").trim();
  }
  /**
   * Fallback summary extraction for cases where pattern matching fails
   */
  extractFallbackSummary(content) {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    const clinicalSentences = sentences.filter((s) => {
      const lower = s.toLowerCase();
      return !lower.includes("thank you") && !lower.includes("dear") && !lower.includes("sincerely") && !lower.includes("kind regards") && !lower.includes("yours faithfully") && !lower.includes("it was a pleasure") && !lower.startsWith("please") && lower.length > 20;
    });
    if (clinicalSentences.length > 0) {
      let summary = clinicalSentences[0].trim();
      if (summary.length > 150) {
        summary = summary.substring(0, 147) + "...";
      }
      return summary;
    }
    return content.substring(0, 150).trim() + (content.length > 150 ? "..." : "");
  }
  /**
   * Extract basic letter context without complex template logic
   */
  extractBasicLetterData(input) {
    const text = input.toLowerCase();
    return {
      letterType: this.determineLetterType(text),
      urgency: this.extractUrgency(text),
      medications: this.extractMentionedMedications(text)
    };
  }
  determineLetterType(text) {
    if (text.includes("refer") || text.includes("referral") || text.includes("specialist opinion")) {
      return "referral";
    }
    if (text.includes("follow up") || text.includes("follow-up") || text.includes("appointment")) {
      return "follow-up";
    }
    if (text.includes("discharge") || text.includes("discharged") || text.includes("going home")) {
      return "discharge";
    }
    if (text.includes("consultation") || text.includes("consult") || text.includes("opinion")) {
      return "consultation";
    }
    if (text.includes("results") || text.includes("test") || text.includes("investigation")) {
      return "results";
    }
    if (text.includes("medication") || text.includes("prescription") || text.includes("drug change")) {
      return "medication";
    }
    return "general";
  }
  extractUrgency(text) {
    if (text.includes("immediate") || text.includes("emergent") || text.includes("stat")) {
      return "immediate";
    }
    if (text.includes("very urgent") || text.includes("asap") || text.includes("priority")) {
      return "very_urgent";
    }
    if (text.includes("urgent") || text.includes("soon")) {
      return "urgent";
    }
    if (text.includes("semi urgent") || text.includes("semi-urgent")) {
      return "semi_urgent";
    }
    return "routine";
  }
  extractMentionedMedications(text) {
    const medications = [];
    for (const [, meds] of Object.entries(this.medicationCategories)) {
      for (const med of meds) {
        if (text.includes(med.toLowerCase())) {
          medications.push(med);
        }
      }
    }
    return [...new Set(medications)];
  }
}
const QuickLetterAgent$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  QuickLetterAgent
}, Symbol.toStringTag, { value: "Module" }));
class ConsultationAgent extends NarrativeLetterAgent {
  constructor() {
    super(
      "Consultation Agent",
      "Medical Consultation",
      "Generates comprehensive consultation reports as narrative prose for colleague communication",
      "consultation"
    );
  }
  // Inherits clean narrative processing from NarrativeLetterAgent base class
  // No additional processing needed - base class handles all narrative formatting rules
}
const ConsultationAgent$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ConsultationAgent
}, Symbol.toStringTag, { value: "Module" }));
export {
  AngiogramPCIAgent$1 as A,
  ConsultationAgent$1 as C,
  MedicalAgent as M,
  QuickLetterAgent$1 as Q,
  TAVIAgent$1 as T
};
