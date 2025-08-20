var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { M as MedicalAgent } from "./agents.BUoiklxm.js";
import { L as LMStudioService } from "./services.NrlqZpNE.js";
const PFOClosureSystemPrompts = {
  /**
   * PFO Closure Procedure Report Agent System Prompt
   * Enhanced with comprehensive medical knowledge for patent foramen ovale closure devices
   */
  pfoClosureProcedureAgent: {
    systemPrompt: `You are a specialist interventional cardiologist generating PFO closure procedural reports for medical records.

CRITICAL INSTRUCTIONS:
- Generate a PROCEDURAL REPORT in operation report style, NOT a consultation letter
- DO NOT include "Dear Doctor", "Thanks for asking me to see", or letter-style formatting
- DO NOT include patient greeting or letter closings
- Use professional, clinical language matching interventional cardiology standards
- Structure report in exactly THREE sections with specific clinical content
- Use AUSTRALIAN medical terminology: TOE (transoesophageal), ICE, anaesthesia, recognised, colour

Required sections (use exactly these headers):

**PREAMBLE**:
- Patient demographics with indication for PFO closure
- Clinical presentation: cryptogenic stroke, migraine, decompression sickness
- Neurological workup and stroke investigation findings
- Imaging assessment: TOE/ICE findings of PFO anatomy
- Anatomical suitability: tunnel length, septal thickness, rim assessment
- Device selection rationale: "Based on PFO anatomy and septal characteristics, an [device] [size] was selected"

**PROCEDURE**:
- Anaesthesia approach: "under local anaesthesia with conscious sedation" or general anaesthesia
- Vascular access: femoral venous access with ICE/TOE guidance
- ICE guidance: "intracardiac echocardiography confirmed PFO anatomy"
- Device sizing: balloon sizing or direct measurement
- Device deployment: "occluder deployed with satisfactory positioning across the septum"
- Positioning assessment: device stability and septal position
- Residual shunt evaluation: "colour Doppler demonstrated complete closure"
- Final assessment: device position and immediate outcomes
- Closure: femoral venous closure technique

**CONCLUSION**:
- Simple success statement: "Successful deployment of [size] [manufacturer] PFO occluder"
- Closure assessment: complete closure vs residual shunt status
- Device stability and positioning
- Immediate post-procedural status

CLINICAL LANGUAGE REQUIREMENTS:
- Australian spelling: anaesthesia, recognised, utilised, colour, oesophageal
- Precise measurements: "PFO tunnel length 8mm", "septal thickness 4mm", "device size 25mm"
- Technical terminology: "intracardiac echo guidance", "balloon sizing", "delivery catheter"
- Assessment language: "satisfactory device position", "complete closure", "no residual shunt"
- Device specifications: "Amplatzer PFO Occluder", "Gore Cardioform", "Occlutech Figulla"

DEVICE-SPECIFIC TERMINOLOGY:
- Amplatzer: "Amplatzer PFO Occluder", "self-expanding nitinol", "dual-disc design"
- Gore Cardioform: "Gore Cardioform Septal Occluder", "ePTFE membranes", "nitinol framework"
- Occlutech: "Occlutech Figulla Flex PFO", "flexible design", "braided nitinol mesh"
- Common features: "delivery catheter", "loading sheath", "recapture capability"

PFO ANATOMY DOCUMENTATION:
- Tunnel characteristics: length, diameter, angulation
- Septal thickness and tissue quality
- Rim assessment: aortic, posterior, superior, inferior rims
- Associated features: atrial septal aneurysm, Eustachian valve
- Functional assessment: right-to-left shunt quantification

ICE/TOE GUIDANCE TERMINOLOGY:
- "intracardiac echocardiography confirmed anatomy", "real-time ICE guidance"
- "TOE assessment demonstrated", "colour Doppler evaluation"
- "balloon sizing performed", "appropriate device selection"
- "satisfactory device deployment", "complete septal coverage"

Use standard interventional cardiology procedural documentation format.
Target audience: Medical record documentation for interventional cardiologists, neurologists, and referring physicians.`,
    userPromptTemplate: `Generate a comprehensive PFO closure procedural report using the THREE-SECTION format based on the following procedural dictation:

{input}

Structure the report with exactly these three sections:

**PREAMBLE**:
- Start with patient demographics and indication for PFO closure
- Include clinical presentation, neurological workup, and imaging findings
- Document ICE/TOE assessment and anatomical suitability
- Use clinical language: "cryptogenic stroke", "recognised indication", "Based on PFO anatomy..."

**PROCEDURE**:
- Document anaesthesia and ICE/TOE guidance approach
- Include specific technical details: balloon sizing, device deployment, positioning assessment
- Describe closure confirmation with shunt evaluation
- Document immediate outcomes and device stability
- Use procedural terminology: "under ICE guidance", "satisfactory positioning", "complete closure"

**CONCLUSION**:
- Provide simple success statement: "Successful deployment of [size] [manufacturer] PFO occluder"
- Document closure status and device position
- Include immediate post-procedural assessment

Preserve all medical facts accurately with Australian spelling (TOE, anaesthesia, colour) and interventional cardiology terminology. Use precise measurements with units (mm, French sizes).`
  }
};
const PFOClosureMedicalPatterns = {
  // PFO anatomy assessment patterns
  pfoTunnelLength: /(?:pfo\s+)?tunnel\s+length\s+(?:of\s+)?(\d+)\s*mm/gi,
  septalThickness: /septal\s+thickness\s+(?:of\s+)?(\d+)\s*mm/gi,
  deviceSize: /(?:device\s+size\s+|occluder\s+)?(\d+)\s*mm/gi,
  // Anatomical features
  atrialSeptalAneurysm: /atrial\s+septal\s+aneurysm/gi,
  eustachianValve: /eustachian\s+valve/gi,
  // Complications
  deviceEmbolization: /device\s+embolization/gi,
  arrhythmias: /arrhythmias?/gi,
  airEmbolism: /air\s+embolism/gi,
  perforation: /(?:atrial\s+|cardiac\s+)?perforation/gi
};
const PFOClosureValidationRules = {
  // Clinical language patterns that should be preserved
  clinicalPhrases: [
    "cryptogenic stroke",
    "recognised indication",
    "satisfactory device position",
    "complete closure",
    "intracardiac echo guidance",
    "colour Doppler demonstrated",
    "no residual shunt",
    "satisfactory positioning"
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
class PFOClosureAgent extends MedicalAgent {
  constructor() {
    super(
      "PFO Closure Agent",
      "Interventional Cardiology",
      "Generates comprehensive PFO closure procedural reports with device deployment and closure assessment",
      "pfo-closure",
      "You are a specialist interventional cardiologist generating PFO closure procedural reports for medical records."
    );
    __publicField(this, "lmStudioService");
    // PFO closure-specific medical knowledge
    __publicField(this, "occluderTypes", {
      "amplatzer pfo occluder": "Amplatzer PFO Occluder",
      "gore cardioform": "Gore Cardioform",
      "occlutech figulla": "Occlutech Figulla",
      "figulla flex": "Occlutech Figulla Flex"
    });
    __publicField(this, "closureIndications", {
      "cryptogenic stroke": "cryptogenic_stroke",
      "migraine with aura": "migraine_with_aura",
      "decompression sickness": "decompression_sickness",
      "paradoxical embolism": "paradoxical_embolism"
    });
    __publicField(this, "deviceSizes", {
      "18mm": "18mm",
      "20mm": "20mm",
      "22mm": "22mm",
      "25mm": "25mm",
      "27mm": "27mm",
      "30mm": "30mm",
      "35mm": "35mm"
    });
    // Medical terminology corrections for PFO closure with Australian spelling
    __publicField(this, "pfoTerminologyCorrections", {
      "patent foramen ovale closure": "PFO closure",
      "pfo occluder": "PFO occluder",
      "amplatzer": "Amplatzer",
      "cardioform": "Cardioform",
      "occlutech": "Occlutech",
      "figulla": "Figulla",
      "transesophageal": "transoesophageal",
      "esophageal": "oesophageal",
      "tee": "TOE",
      // Critical Australian correction
      "intracardiac echo": "intracardiac echo",
      "ice guidance": "ICE guidance",
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
      const correctedInput = this.correctPFOTerminology(input);
      const pfoClosureData = this.extractPFOClosureData(correctedInput);
      const pfoAnatomy = this.extractPFOAnatomyData(correctedInput);
      const deviceAssessment = this.assessDeviceDeployment(correctedInput);
      const complications = this.identifyComplications(correctedInput);
      const reportContent = await this.generateStructuredReport(
        pfoClosureData,
        pfoAnatomy,
        deviceAssessment,
        complications,
        correctedInput
      );
      const sections = this.parseResponse(reportContent, context);
      const processingTime = Date.now() - startTime;
      const report = {
        ...this.createReport(reportContent, sections, context, processingTime, 0.95),
        pfoClosureData,
        pfoAnatomy,
        deviceAssessment,
        complications
      };
      this.addProcedureMemory("PFO Closure", {
        device: deviceAssessment.deviceType,
        size: deviceAssessment.deviceSize,
        closureStatus: deviceAssessment.closureStatus,
        complications: complications.length
      }, deviceAssessment.deploymentSuccess);
      return report;
    } catch (error) {
      console.error("PFO closure processing error:", error);
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `PFO closure processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
          [],
          context,
          processingTime,
          0.1
        ),
        pfoClosureData: this.getEmptyPFOClosureData(),
        pfoAnatomy: this.getEmptyPFOAnatomyData(),
        deviceAssessment: this.getEmptyDeviceAssessment(),
        complications: []
      };
    }
  }
  buildMessages(input, _context) {
    const systemPrompt = PFOClosureSystemPrompts.pfoClosureProcedureAgent.systemPrompt;
    const userPrompt = PFOClosureSystemPrompts.pfoClosureProcedureAgent.userPromptTemplate.replace("{input}", input);
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
  correctPFOTerminology(text) {
    let correctedText = text;
    for (const [incorrect, correct] of Object.entries(this.pfoTerminologyCorrections)) {
      const regex = new RegExp(incorrect, "gi");
      correctedText = correctedText.replace(regex, correct);
    }
    for (const { us, au } of PFOClosureValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, "gi");
      correctedText = correctedText.replace(regex, au);
    }
    for (const phrase of PFOClosureValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      if (regex.test(correctedText)) {
        correctedText = correctedText.replace(regex, phrase);
      }
    }
    return correctedText;
  }
  extractPFOClosureData(input) {
    return {
      procedureType: "PFO Closure",
      indication: this.extractIndication(input),
      clinicalPresentation: this.extractClinicalPresentation(input),
      neurologicalWorkup: this.extractNeurologicalWorkup(input),
      imagingFindings: this.extractImagingFindings(input),
      deviceSelection: this.extractDeviceSelection(input),
      proceduralDetails: this.extractProceduralDetails(input),
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }
  extractPFOAnatomyData(input) {
    const text = input.toLowerCase();
    const tunnelLengthPattern = PFOClosureMedicalPatterns.pfoTunnelLength;
    const septalThicknessPattern = PFOClosureMedicalPatterns.septalThickness;
    const tunnelLength = this.extractMeasurement(input, tunnelLengthPattern);
    const septalThickness = this.extractMeasurement(input, septalThicknessPattern);
    const hasAtrialSeptalAneurysm = PFOClosureMedicalPatterns.atrialSeptalAneurysm.test(text);
    const hasEustachianValve = PFOClosureMedicalPatterns.eustachianValve.test(text);
    const rimAssessment = this.extractRimAssessment(input);
    return {
      tunnelLength: tunnelLength ? `${tunnelLength}mm` : "",
      septalThickness: septalThickness ? `${septalThickness}mm` : "",
      tunnelDiameter: this.extractValue(input, /tunnel\s+diameter[:\s]+([^.]+)/i) || "",
      atrialSeptalAneurysm: hasAtrialSeptalAneurysm,
      eustachianValve: hasEustachianValve,
      rimAssessment,
      shuntQuantification: this.extractShuntQuantification(input)
    };
  }
  assessDeviceDeployment(input) {
    const text = input.toLowerCase();
    let deploymentSuccess = "unknown";
    if (text.includes("satisfactory") && (text.includes("position") || text.includes("deployment"))) {
      deploymentSuccess = "successful";
    } else if (text.includes("failed") || text.includes("unsuccessful") || text.includes("embolization")) {
      deploymentSuccess = "complicated";
    }
    const deviceType = this.extractDeviceType(input);
    const deviceSize = this.extractDeviceSize(input);
    let closureStatus = "unknown";
    if (text.includes("complete closure") || text.includes("no") && text.includes("shunt")) {
      closureStatus = "complete";
    } else if (text.includes("residual shunt") || text.includes("trivial shunt")) {
      closureStatus = "residual_shunt";
    }
    const deviceStability = text.includes("stable") || text.includes("well positioned") ? "stable" : "unknown";
    const complications = this.extractDeploymentComplications(text);
    return {
      deploymentSuccess,
      deviceType,
      deviceSize,
      closureStatus,
      deviceStability,
      balloonSizing: this.extractBalloonSizing(input),
      complications
    };
  }
  identifyComplications(input) {
    const text = input.toLowerCase();
    const complications = [];
    const complicationPatterns = [
      {
        pattern: PFOClosureMedicalPatterns.deviceEmbolization,
        type: "device_embolization",
        severity: "major"
      },
      {
        pattern: PFOClosureMedicalPatterns.arrhythmias,
        type: "arrhythmias",
        severity: "minor"
      },
      {
        pattern: PFOClosureMedicalPatterns.airEmbolism,
        type: "air_embolism",
        severity: "major"
      },
      {
        pattern: PFOClosureMedicalPatterns.perforation,
        type: "perforation",
        severity: "life-threatening"
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
  async generateStructuredReport(pfoClosureData, pfoAnatomy, deviceAssessment, complications, originalInput) {
    console.log("🔧 Generating PFO closure report with LMStudio medgemma-27b...");
    try {
      const extractedData = {
        pfoClosureData,
        pfoAnatomy,
        deviceAssessment,
        complications
      };
      const contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive PFO closure procedural report using the above extracted data and the following dictation. Include all relevant device specifications, anatomical assessments, deployment details, and closure outcomes. Use proper Australian medical terminology (TOE, ICE, anaesthesia, colour Doppler) and structured formatting.`;
      const report = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);
      console.log("✅ PFO closure report generated successfully");
      return report;
    } catch (error) {
      console.error("❌ Error generating PFO closure report:", error);
      return `**PATENT FORAMEN OVALE CLOSURE REPORT**

**INDICATION**: ${pfoClosureData.indication || "[Not specified in dictation]"}

**PROCEDURE**: 
- Device: ${deviceAssessment.deviceType} ${deviceAssessment.deviceSize}
- Deployment: ${deviceAssessment.deploymentSuccess}
- Closure Status: ${deviceAssessment.closureStatus}
- Device Stability: ${deviceAssessment.deviceStability}

**PFO ANATOMY**: 
- Tunnel Length: ${pfoAnatomy.tunnelLength}
- Septal Thickness: ${pfoAnatomy.septalThickness}
- Atrial Septal Aneurysm: ${pfoAnatomy.atrialSeptalAneurysm ? "Present" : "Absent"}

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
  extractIndication(input) {
    const text = input.toLowerCase();
    for (const [key, value] of Object.entries(this.closureIndications)) {
      if (text.includes(key)) {
        return value;
      }
    }
    return "cryptogenic_stroke";
  }
  extractDeviceType(input) {
    const text = input.toLowerCase();
    for (const [key, value] of Object.entries(this.occluderTypes)) {
      if (text.includes(key)) {
        return value;
      }
    }
    return "Amplatzer PFO Occluder";
  }
  extractDeviceSize(input) {
    const sizeMatch = input.match(PFOClosureMedicalPatterns.deviceSize);
    if (sizeMatch) {
      const size = `${sizeMatch[1]}mm`;
      return Object.keys(this.deviceSizes).includes(size) ? size : "25mm";
    }
    return "25mm";
  }
  extractClinicalPresentation(input) {
    return this.extractValue(input, /(?:clinical\s+)?presentation[:\s]+([^.]+)/i) || "";
  }
  extractNeurologicalWorkup(input) {
    return this.extractValue(input, /neurological\s+(?:workup|assessment)[:\s]+([^.]+)/i) || "";
  }
  extractImagingFindings(input) {
    return this.extractValue(input, /(?:imaging|echo)\s+findings[:\s]+([^.]+)/i) || "";
  }
  extractDeviceSelection(input) {
    return this.extractValue(input, /device\s+selection[:\s]+([^.]+)/i) || "";
  }
  extractProceduralDetails(input) {
    return {
      iceGuidance: input.toLowerCase().includes("ice") ? "Comprehensive ICE guidance" : "",
      toeGuidance: input.toLowerCase().includes("toe") ? "TOE guidance" : "",
      balloonSizing: this.extractBalloonSizing(input),
      deviceDeployment: this.extractValue(input, /deployment[:\s]+([^.]+)/i) || "",
      closureConfirmation: this.extractValue(input, /closure[:\s]+([^.]+)/i) || ""
    };
  }
  extractBalloonSizing(input) {
    const balloonMatch = input.match(/balloon\s+siz/i);
    return balloonMatch ? "Balloon sizing performed" : "";
  }
  extractRimAssessment(input) {
    return this.extractValue(input, /rim\s+assessment[:\s]+([^.]+)/i) || "";
  }
  extractShuntQuantification(input) {
    return this.extractValue(input, /shunt[:\s]+([^.]+)/i) || "";
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
    if (text.includes("embolization")) complications.push("device_embolization");
    if (text.includes("arrhythmia")) complications.push("arrhythmias");
    if (text.includes("air embolism")) complications.push("air_embolism");
    if (text.includes("perforation")) complications.push("perforation");
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
  getEmptyPFOClosureData() {
    return {
      procedureType: "PFO Closure",
      indication: "cryptogenic_stroke",
      clinicalPresentation: "",
      neurologicalWorkup: "",
      imagingFindings: "",
      deviceSelection: "",
      proceduralDetails: {
        iceGuidance: "",
        toeGuidance: "",
        balloonSizing: "",
        deviceDeployment: "",
        closureConfirmation: ""
      },
      immediateOutcomes: "",
      recommendations: "",
      followUp: ""
    };
  }
  getEmptyPFOAnatomyData() {
    return {
      tunnelLength: "",
      septalThickness: "",
      tunnelDiameter: "",
      atrialSeptalAneurysm: false,
      eustachianValve: false,
      rimAssessment: "",
      shuntQuantification: ""
    };
  }
  getEmptyDeviceAssessment() {
    return {
      deploymentSuccess: "unknown",
      deviceType: "Amplatzer PFO Occluder",
      deviceSize: "25mm",
      closureStatus: "unknown",
      deviceStability: "unknown",
      balloonSizing: "",
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
  PFOClosureAgent
};
