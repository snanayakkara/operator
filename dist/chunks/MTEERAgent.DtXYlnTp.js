var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { M as MedicalAgent } from "./agents.BUoiklxm.js";
import { L as LMStudioService } from "./services.NrlqZpNE.js";
const MTEERSystemPrompts = {
  /**
   * mTEER Procedure Report Agent System Prompt
   * Enhanced with comprehensive medical knowledge for mitral valve edge-to-edge repair
   */
  mteerProcedureAgent: {
    systemPrompt: `You are a specialist interventional cardiologist generating mTEER procedural reports for medical records.

CRITICAL INSTRUCTIONS:
- Generate a PROCEDURAL REPORT in operation report style, NOT a consultation letter
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- Use professional, clinical language matching interventional cardiology standards
- Structure report in exactly THREE sections with specific clinical content
- Use AUSTRALIAN medical terminology: TOE (transoesophageal), colour Doppler, anaesthesia, recognised

Required sections (use exactly these headers):

**PREAMBLE**:
- Patient demographics with indication for mTEER
- Mitral regurgitation severity and aetiology (degenerative vs functional)
- Transthoracic echo findings with MR grade and EROA
- TOE assessment: "suitable leaflet anatomy for edge-to-edge repair"
- Anatomical suitability: leaflet coaptation length, mobility, calcification
- Device selection rationale: "Based on leaflet morphology and regurgitant jet location, a [device] [size] was selected"

**PROCEDURE**:
- Anaesthesia approach: "under general anaesthesia with TOE guidance"
- Vascular access: femoral venous access with transseptal puncture
- TOE guidance: "comprehensive TOE assessment confirmed suitable anatomy"
- Device delivery: catheter positioning and clip deployment
- Clip placement: "clip deployed at the A2-P2 level with satisfactory leaflet capture"
- Immediate assessment: residual MR grade, transmitral gradient
- Multiple clips: if applicable, additional clip placement and positioning
- Final TOE assessment: "colour Doppler demonstrated mild residual MR"
- Closure: femoral venous closure technique

**CONCLUSION**:
- Simple success statement: "Successful deployment of [number] [device] clip(s)"
- Final MR assessment: residual mitral regurgitation grade
- Functional improvement: transmitral gradient and valve function
- Immediate post-procedural status

CLINICAL LANGUAGE REQUIREMENTS:
- Australian spelling: anaesthesia, recognised, utilised, colour, oesophageal
- Precise measurements: "MR grade 4+", "EROA 0.4 cm²", "mean gradient 8 mmHg"
- Technical terminology: "transseptal puncture", "steerable guide catheter", "leaflet capture"
- Assessment language: "satisfactory leaflet capture", "mild residual MR", "preserved valve function"
- Device specifications: "MitraClip NTW", "PASCAL P10", "clip deployment"

DEVICE-SPECIFIC TERMINOLOGY:
- Abbott MitraClip: "MitraClip NT/NTW/XTW system", "clip arms", "gripper activation"
- Edwards PASCAL: "PASCAL P10/ACE system", "paddle deployment", "central spacer"
- Common features: "steerable guide catheter", "delivery system", "leaflet grasping"

MITRAL REGURGITATION DOCUMENTATION:
- Grading system: Grade 1+ (mild), 2+ (moderate), 3+ (moderate-severe), 4+ (severe)
- EROA measurements: effective regurgitant orifice area in cm²
- Regurgitant volume and fraction when available
- Jet characteristics: central vs eccentric, broad vs narrow
- Functional assessment: transmitral gradients pre/post procedure

TOE GUIDANCE TERMINOLOGY:
- "comprehensive TOE assessment", "real-time TOE guidance"
- "leaflet morphology assessment", "regurgitant jet characterisation"
- "transseptal puncture under TOE guidance", "catheter positioning confirmed"
- "satisfactory clip positioning", "optimal leaflet capture"

Use standard interventional cardiology procedural documentation format.
Target audience: Medical record documentation for interventional cardiologists, cardiac surgeons, and referring physicians.`,
    userPromptTemplate: `Generate a comprehensive mTEER procedural report using the THREE-SECTION format based on the following procedural dictation:

{input}

Structure the report with exactly these three sections:

**PREAMBLE**:
- Start with patient demographics and indication for mTEER
- Include MR severity, aetiology, and echo findings
- Document TOE assessment and anatomical suitability
- Use clinical language: "suitable leaflet anatomy", "degenerative MR", "Based on leaflet morphology..."

**PROCEDURE**:
- Document anaesthesia and TOE guidance approach
- Include specific technical details: transseptal puncture, device delivery, clip positioning
- Describe clip deployment with leaflet capture assessment
- Document immediate outcomes and residual MR evaluation
- Use procedural terminology: "under TOE guidance", "satisfactory leaflet capture", "at the A2-P2 level"

**CONCLUSION**:
- Provide simple success statement: "Successful deployment of [number] [device] clip(s)"
- Document final MR grade and valve function
- Include immediate post-procedural status

Preserve all medical facts accurately with Australian spelling (TOE, anaesthesia, colour) and interventional cardiology terminology. Use precise measurements with units (mmHg, cm², grades).`
  }
};
const MTEERMedicalPatterns = {
  // Mitral regurgitation assessment patterns
  mrGrade: /(?:mr|mitral regurgitation)\s+grade\s+([1-4]\+?)/gi,
  eroa: /eroa\s+(?:of\s+)?(\d+\.?\d*)\s*cm²?/gi,
  regurgitantVolume: /regurgitant\s+volume\s+(?:of\s+)?(\d+)\s*ml/gi,
  clipNumbers: /(\d+)\s+clip[s]?/gi,
  // Complications
  leafletTear: /leaflet\s+tear/gi,
  chordaeRupture: /chordae\s+rupture/gi,
  cardiacTamponade: /cardiac\s+tamponade/gi,
  residualShunt: /residual\s+shunt/gi
};
const MTEERValidationRules = {
  // Clinical language patterns that should be preserved
  clinicalPhrases: [
    "suitable leaflet anatomy",
    "degenerative mitral regurgitation",
    "functional mitral regurgitation",
    "satisfactory leaflet capture",
    "comprehensive TOE assessment",
    "colour Doppler demonstrated",
    "mild residual MR",
    "preserved valve function"
  ],
  // Australian spelling requirements
  australianSpelling: [
    { us: "transesophageal", au: "transoesophageal" },
    { us: "esophageal", au: "oesophageal" },
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
class MTEERAgent extends MedicalAgent {
  constructor() {
    super(
      "mTEER Procedure Agent",
      "Interventional Cardiology",
      "Generates comprehensive mTEER procedural reports with clip deployment and mitral regurgitation assessment",
      "mteer",
      "You are a specialist interventional cardiologist generating mTEER procedural reports for medical records."
    );
    __publicField(this, "lmStudioService");
    // mTEER-specific medical knowledge
    __publicField(this, "clipTypes", {
      "mitraclip nt": "MitraClip NT",
      "mitraclip ntw": "MitraClip NTW",
      "mitraclip xtw": "MitraClip XTW",
      "pascal p10": "PASCAL P10",
      "pascal ace": "PASCAL ACE"
    });
    __publicField(this, "mrGrades", {
      "1+": "mild",
      "2+": "moderate",
      "3+": "moderate-severe",
      "4+": "severe"
    });
    __publicField(this, "anatomicalLocations", {
      "a2-p2": "A2-P2 level",
      "a1-p1": "A1-P1 level",
      "a3-p3": "A3-P3 level",
      "commissural": "Commissural level"
    });
    // Medical terminology corrections for mTEER with Australian spelling
    __publicField(this, "mteerTerminologyCorrections", {
      "mitral transcatheter edge to edge repair": "mTEER",
      "mitraclip": "MitraClip",
      "pascal clip": "PASCAL",
      "transesophageal": "transoesophageal",
      "esophageal": "oesophageal",
      "tee": "TOE",
      // Critical Australian correction
      "anesthesia": "anaesthesia",
      "color doppler": "colour Doppler",
      "color": "colour",
      "recognize": "recognise",
      "optimize": "optimise",
      "utilize": "utilise",
      "center": "centre"
    });
    this.lmStudioService = LMStudioService.getInstance();
  }
  async process(input, context) {
    const startTime = Date.now();
    try {
      this.updateMemory("currentInput", input);
      this.updateMemory("processingContext", context);
      const correctedInput = this.correctMTEERTerminology(input);
      const mteerData = this.extractMTEERData(correctedInput);
      const mitralRegurgitation = this.extractMitralRegurgitationData(correctedInput);
      const clipAssessment = this.assessClipDeployment(correctedInput);
      const complications = this.identifyComplications(correctedInput);
      const reportContent = await this.generateStructuredReport(
        mteerData,
        mitralRegurgitation,
        clipAssessment,
        complications,
        correctedInput
      );
      const sections = this.parseResponse(reportContent, context);
      const processingTime = Date.now() - startTime;
      const report = {
        ...this.createReport(reportContent, sections, context, processingTime, 0.95),
        mteerData,
        mitralRegurgitation,
        clipAssessment,
        complications
      };
      this.addProcedureMemory("mTEER", {
        clips: clipAssessment.clipsDeployed,
        finalMRGrade: mitralRegurgitation.postProcedure.mrGrade,
        complications: complications.length
      }, clipAssessment.deploymentSuccess);
      return report;
    } catch (error) {
      console.error("mTEER processing error:", error);
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `mTEER processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
          [],
          context,
          processingTime,
          0.1
        ),
        mteerData: this.getEmptyMTEERData(),
        mitralRegurgitation: this.getEmptyMitralRegurgitationData(),
        clipAssessment: this.getEmptyClipAssessment(),
        complications: []
      };
    }
  }
  buildMessages(input, _context) {
    const systemPrompt = MTEERSystemPrompts.mteerProcedureAgent.systemPrompt;
    const userPrompt = MTEERSystemPrompts.mteerProcedureAgent.userPromptTemplate.replace("{input}", input);
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
  correctMTEERTerminology(text) {
    let correctedText = text;
    for (const [incorrect, correct] of Object.entries(this.mteerTerminologyCorrections)) {
      const regex = new RegExp(incorrect, "gi");
      correctedText = correctedText.replace(regex, correct);
    }
    for (const { us, au } of MTEERValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, "gi");
      correctedText = correctedText.replace(regex, au);
    }
    for (const phrase of MTEERValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      if (regex.test(correctedText)) {
        correctedText = correctedText.replace(regex, phrase);
      }
    }
    return correctedText;
  }
  extractMTEERData(input) {
    return {
      procedureType: "mTEER",
      indication: this.extractIndication(input),
      anatomicalAssessment: this.extractAnatomicalAssessment(input),
      deviceDetails: this.extractDeviceDetails(input),
      proceduralDetails: this.extractProceduralDetails(input),
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }
  extractMitralRegurgitationData(input) {
    const text = input.toLowerCase();
    const eroaPattern = MTEERMedicalPatterns.eroa;
    const regurgitantVolumePattern = MTEERMedicalPatterns.regurgitantVolume;
    const parts = text.split(/(?:post[-\s]?(?:procedure|deployment|clip)|after\s+(?:clip|deployment)|final|immediate\s+(?:assessment|outcome))/i);
    const preText = parts[0] || "";
    const postText = parts.length > 1 ? parts[1] : "";
    const preMRGrade = this.extractMRGrade(preText);
    const preEROA = this.extractMeasurement(preText, eroaPattern);
    const preRegurgitantVolume = this.extractMeasurement(preText, regurgitantVolumePattern);
    const postMRGrade = this.extractMRGrade(postText) || this.extractMRGrade(input);
    const postRegurgitantVolume = this.extractMeasurement(postText, regurgitantVolumePattern);
    const aetiology = this.extractMRAetiology(input);
    return {
      preProcedure: {
        mrGrade: preMRGrade,
        eroa: preEROA ? `${preEROA} cm²` : "",
        regurgitantVolume: preRegurgitantVolume ? `${preRegurgitantVolume} ml` : "",
        aetiology
      },
      postProcedure: {
        mrGrade: postMRGrade,
        regurgitantVolume: postRegurgitantVolume ? `${postRegurgitantVolume} ml` : "",
        transmitralGradient: this.extractTransmitralGradient(input)
      },
      improvement: this.calculateMRImprovement(preMRGrade, postMRGrade)
    };
  }
  assessClipDeployment(input) {
    const text = input.toLowerCase();
    let deploymentSuccess = "unknown";
    if (text.includes("satisfactory") && (text.includes("capture") || text.includes("deployment"))) {
      deploymentSuccess = "successful";
    } else if (text.includes("failed") || text.includes("unsuccessful")) {
      deploymentSuccess = "complicated";
    }
    const clipMatch = text.match(MTEERMedicalPatterns.clipNumbers);
    const clipsDeployed = clipMatch ? parseInt(clipMatch[1]) : 1;
    const leafletCapture = text.includes("satisfactory") && text.includes("capture") ? "satisfactory" : text.includes("adequate") && text.includes("capture") ? "adequate" : "unknown";
    const positioning = this.extractClipPositioning(input);
    const complications = this.extractDeploymentComplications(text);
    return {
      deploymentSuccess,
      clipsDeployed,
      leafletCapture,
      positioning,
      complications
    };
  }
  identifyComplications(input) {
    const text = input.toLowerCase();
    const complications = [];
    const complicationPatterns = [
      {
        pattern: MTEERMedicalPatterns.leafletTear,
        type: "leaflet_tear",
        severity: "major"
      },
      {
        pattern: MTEERMedicalPatterns.chordaeRupture,
        type: "chordae_rupture",
        severity: "major"
      },
      {
        pattern: MTEERMedicalPatterns.cardiacTamponade,
        type: "cardiac_tamponade",
        severity: "life-threatening"
      },
      {
        pattern: MTEERMedicalPatterns.residualShunt,
        type: "residual_shunt",
        severity: "minor"
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
  async generateStructuredReport(mteerData, mitralRegurgitation, clipAssessment, complications, originalInput) {
    console.log("🔧 Generating mTEER report with LMStudio medgemma-27b...");
    try {
      const extractedData = {
        mteerData,
        mitralRegurgitation,
        clipAssessment,
        complications
      };
      const contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive mTEER procedural report using the above extracted data and the following dictation. Include all relevant clip specifications, mitral regurgitation assessments, deployment details, and outcomes. Use proper Australian medical terminology (TOE, anaesthesia, colour Doppler) and structured formatting.`;
      const report = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);
      console.log("✅ mTEER report generated successfully");
      return report;
    } catch (error) {
      console.error("❌ Error generating mTEER report:", error);
      return `**MITRAL TRANSCATHETER EDGE-TO-EDGE REPAIR REPORT**

**INDICATION**: ${mteerData.indication || "[Not specified in dictation]"}

**PROCEDURE**: 
- Device: ${mteerData.deviceDetails.manufacturer} ${mteerData.deviceDetails.model}
- Clips Deployed: ${clipAssessment.clipsDeployed}
- Positioning: ${clipAssessment.positioning}
- Leaflet Capture: ${clipAssessment.leafletCapture}

**MITRAL REGURGITATION ASSESSMENT**: 
- Pre-procedure: ${mitralRegurgitation.preProcedure.mrGrade} (${mitralRegurgitation.preProcedure.aetiology})
- Post-procedure: ${mitralRegurgitation.postProcedure.mrGrade}
- Improvement: ${mitralRegurgitation.improvement}

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
  extractMRGrade(text) {
    const gradeMatch = text.match(MTEERMedicalPatterns.mrGrade);
    if (gradeMatch) {
      const grade = gradeMatch[1];
      return this.mrGrades[grade] || "moderate";
    }
    if (text.includes("severe")) return "severe";
    if (text.includes("moderate-severe")) return "moderate-severe";
    if (text.includes("moderate")) return "moderate";
    if (text.includes("mild")) return "mild";
    return "moderate";
  }
  extractMRAetiology(input) {
    const text = input.toLowerCase();
    if (text.includes("degenerative")) return "degenerative";
    if (text.includes("functional")) return "functional";
    if (text.includes("mixed")) return "mixed";
    return "unknown";
  }
  extractTransmitralGradient(input) {
    const gradientMatch = input.match(/transmitral\s+gradient\s+(?:of\s+)?(\d+)\s*mm\s*hg/i);
    return gradientMatch ? `${gradientMatch[1]} mmHg` : "";
  }
  calculateMRImprovement(preMR, postMR) {
    const gradeValues = { "mild": 1, "moderate": 2, "moderate-severe": 3, "severe": 4 };
    const preValue = gradeValues[preMR] || 0;
    const postValue = gradeValues[postMR] || 0;
    const improvement = preValue - postValue;
    if (improvement >= 2) return "Significant improvement";
    if (improvement === 1) return "Moderate improvement";
    if (improvement === 0) return "No change";
    return "Minimal change";
  }
  extractIndication(input) {
    const indicationPattern = /indication[:\s]+([^.]+)/i;
    const match = input.match(indicationPattern);
    return match ? match[1].trim() : "";
  }
  extractAnatomicalAssessment(input) {
    return {
      leafletMorphology: this.extractValue(input, /leaflet\s+morphology[:\s]+([^.]+)/i) || "",
      coaptationLength: this.extractValue(input, /coaptation\s+length[:\s]+([^.]+)/i) || "",
      calcification: this.extractValue(input, /calcification[:\s]+([^.]+)/i) || "",
      mobility: this.extractValue(input, /mobility[:\s]+([^.]+)/i) || ""
    };
  }
  extractDeviceDetails(input) {
    const text = input.toLowerCase();
    let manufacturer = "Abbott";
    let model = "MitraClip";
    if (text.includes("pascal")) {
      manufacturer = "Edwards";
      model = text.includes("ace") ? "PASCAL ACE" : "PASCAL P10";
    } else if (text.includes("mitraclip")) {
      if (text.includes("xtw")) model = "MitraClip XTW";
      else if (text.includes("ntw")) model = "MitraClip NTW";
      else if (text.includes("nt")) model = "MitraClip NT";
    }
    return {
      manufacturer,
      model,
      deliverySystem: this.extractValue(input, /delivery\s+system[:\s]+([^.]+)/i) || "",
      guideCatheter: this.extractValue(input, /guide\s+catheter[:\s]+([^.]+)/i) || ""
    };
  }
  extractProceduralDetails(input) {
    return {
      toeGuidance: input.toLowerCase().includes("toe") ? "Comprehensive TOE guidance" : "",
      transseptalPuncture: this.extractValue(input, /transseptal[:\s]+([^.]+)/i) || "",
      clipDeployment: this.extractValue(input, /deployment[:\s]+([^.]+)/i) || "",
      leafletCapture: this.extractValue(input, /capture[:\s]+([^.]+)/i) || ""
    };
  }
  extractClipPositioning(input) {
    const text = input.toLowerCase();
    for (const [key, location] of Object.entries(this.anatomicalLocations)) {
      if (text.includes(key)) {
        return location;
      }
    }
    return this.extractValue(input, /(?:clip\s+)?position[:\s]+([^.]+)/i) || "";
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
  extractDeploymentComplications(text) {
    const complications = [];
    if (text.includes("leaflet tear")) complications.push("leaflet_tear");
    if (text.includes("inadequate capture")) complications.push("inadequate_capture");
    if (text.includes("malposition")) complications.push("malposition");
    if (text.includes("clip detachment")) complications.push("clip_detachment");
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
  getEmptyMTEERData() {
    return {
      procedureType: "mTEER",
      indication: "",
      anatomicalAssessment: {
        leafletMorphology: "",
        coaptationLength: "",
        calcification: "",
        mobility: ""
      },
      deviceDetails: {
        manufacturer: "Abbott",
        model: "MitraClip",
        deliverySystem: "",
        guideCatheter: ""
      },
      proceduralDetails: {
        toeGuidance: "",
        transseptalPuncture: "",
        clipDeployment: "",
        leafletCapture: ""
      },
      immediateOutcomes: "",
      recommendations: "",
      followUp: ""
    };
  }
  getEmptyMitralRegurgitationData() {
    return {
      preProcedure: {
        mrGrade: "moderate",
        eroa: "",
        regurgitantVolume: "",
        aetiology: "unknown"
      },
      postProcedure: {
        mrGrade: "moderate",
        regurgitantVolume: "",
        transmitralGradient: ""
      },
      improvement: "No change"
    };
  }
  getEmptyClipAssessment() {
    return {
      deploymentSuccess: "unknown",
      clipsDeployed: 1,
      leafletCapture: "unknown",
      positioning: "",
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
export {
  MTEERAgent
};
