import type {
  TAVIWorkupAlerts,
  TAVIWorkupClinical,
  TAVIWorkupCTMeasurements,
  TAVIWorkupData,
  TAVIWorkupEchocardiography,
  TAVIWorkupPatient,
  TAVIWorkupLaboratory,
  TAVIWorkupECG,
  TAVIWorkupProcedurePlan,
} from '@/types/medical.types';

interface ExtractionOptions {
  referenceDate?: Date;
}

interface ExtractionResult {
  data: TAVIWorkupData;
  alerts: TAVIWorkupAlerts;
  missingFields: string[];
}

const NUMBER_WORDS: Record<string, number> = {
  'zero': 0,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'eleven': 11,
  'twelve': 12,
  'thirteen': 13,
  'fourteen': 14,
  'fifteen': 15,
  'sixteen': 16,
  'seventeen': 17,
  'eighteen': 18,
  'nineteen': 19,
};

const TENS_WORDS: Record<string, number> = {
  'twenty': 20,
  'thirty': 30,
  'forty': 40,
  'fifty': 50,
  'sixty': 60,
  'seventy': 70,
  'eighty': 80,
  'ninety': 90,
};

const DEVICE_WHITELIST = ['sapien', 'evolut', 'navitor'];

const REQUIRED_FIELDS: Array<{ path: string; label: string }> = [
  { path: 'patient.name', label: 'Patient Name' },
  { path: 'patient.dob', label: 'Date of Birth' },
  { path: 'patient.ageYears', label: 'Calculated Age (years)' },
  { path: 'patient.heightCm', label: 'Height (cm)' },
  { path: 'patient.weightKg', label: 'Weight (kg)' },
  { path: 'patient.bmi', label: 'BMI (kg/m²)' },
  { path: 'patient.bsaMosteller', label: 'BSA (Mosteller, m²)' },

  { path: 'clinical.indication', label: 'Indication' },
  { path: 'clinical.nyhaClass', label: 'NYHA Class' },
  { path: 'clinical.stsPercent', label: 'STS Score (%)' },
  { path: 'clinical.euroScorePercent', label: 'EuroSCORE II (%)' },

  { path: 'laboratory.creatinine', label: 'Creatinine (μmol/L)' },
  { path: 'laboratory.egfr', label: 'eGFR (mL/min/1.73m²)' },
  { path: 'laboratory.hemoglobin', label: 'Hemoglobin (g/L)' },
  { path: 'laboratory.albumin', label: 'Albumin (g/L)' },

  { path: 'ecg.rate', label: 'Heart Rate (bpm)' },
  { path: 'ecg.rhythm', label: 'Cardiac Rhythm' },
  { path: 'ecg.morphology', label: 'QRS Morphology' },
  { path: 'ecg.qrsWidthMs', label: 'QRS Width (ms)' },
  { path: 'ecg.prIntervalMs', label: 'PR Interval (ms)' },

  { path: 'echocardiography.studyDate', label: 'Echo Study Date' },
  { path: 'echocardiography.ejectionFractionPercent', label: 'Ejection Fraction (%)' },
  { path: 'echocardiography.septalThicknessMm', label: 'Septal Thickness (mm)' },
  { path: 'echocardiography.meanGradientMmHg', label: 'Mean Pressure Gradient (mmHg)' },
  { path: 'echocardiography.aorticValveAreaCm2', label: 'Aortic Valve Area (cm²)' },
  { path: 'echocardiography.dimensionlessIndex', label: 'Dimensionless Index' },
  { path: 'echocardiography.mitralRegurgitationGrade', label: 'Mitral Regurgitation Grade' },
  { path: 'echocardiography.rightVentricularSystolicPressureMmHg', label: 'RV Systolic Pressure (mmHg)' },
  { path: 'echocardiography.comments', label: 'Echo Comments' },

  { path: 'ctMeasurements.annulusAreaMm2', label: 'Annulus Area (mm²)' },
  { path: 'ctMeasurements.annulusPerimeterMm', label: 'Annulus Perimeter (mm)' },
  { path: 'ctMeasurements.annulusMinDiameterMm', label: 'Annulus Minimum Diameter (mm)' },
  { path: 'ctMeasurements.annulusMaxDiameterMm', label: 'Annulus Maximum Diameter (mm)' },
  { path: 'ctMeasurements.coronaryHeights.leftMainMm', label: 'Left Main Height (mm)' },
  { path: 'ctMeasurements.coronaryHeights.rightCoronaryMm', label: 'Right Coronary Height (mm)' },
  { path: 'ctMeasurements.sinusOfValsalva.leftMm', label: 'Sinus of Valsalva Left (mm)' },
  { path: 'ctMeasurements.sinusOfValsalva.rightMm', label: 'Sinus of Valsalva Right (mm)' },
  { path: 'ctMeasurements.sinusOfValsalva.nonCoronaryMm', label: 'Sinus of Valsalva Non-coronary (mm)' },
  { path: 'ctMeasurements.coplanarAngles', label: 'Coplanar Angles' },
  { path: 'ctMeasurements.accessVessels.rightCIAmm', label: 'Right CIA Minimal Diameter (mm)' },
  { path: 'ctMeasurements.accessVessels.leftCIAmm', label: 'Left CIA Minimal Diameter (mm)' },
  { path: 'ctMeasurements.accessVessels.rightEIAmm', label: 'Right EIA Minimal Diameter (mm)' },
  { path: 'ctMeasurements.accessVessels.leftEIAmm', label: 'Left EIA Minimal Diameter (mm)' },
  { path: 'ctMeasurements.accessVessels.rightCFAmm', label: 'Right CFA Minimal Diameter (mm)' },
  { path: 'ctMeasurements.accessVessels.leftCFAmm', label: 'Left CFA Minimal Diameter (mm)' },
  { path: 'ctMeasurements.lvotAreaMm2', label: 'LVOT Area (mm²)' },
  { path: 'ctMeasurements.lvotPerimeterMm', label: 'LVOT Perimeter (mm)' },
  { path: 'ctMeasurements.stjDiameterMm', label: 'STJ Diameter (mm)' },
  { path: 'ctMeasurements.stjHeightMm', label: 'STJ Height (mm)' },
  { path: 'ctMeasurements.calciumScore', label: 'Calcium Score' },
  { path: 'ctMeasurements.lvotCalciumScore', label: 'LVOT Calcium Score' },

  { path: 'procedurePlan.valveSelection.type', label: 'Valve Type' },
  { path: 'procedurePlan.valveSelection.size', label: 'Valve Size' },
  { path: 'procedurePlan.valveSelection.reason', label: 'Valve Selection Reason' },
  { path: 'procedurePlan.access.primary', label: 'Primary Access' },
  { path: 'procedurePlan.access.secondary', label: 'Secondary Access' },
  { path: 'procedurePlan.access.wire', label: 'Wire Selection' },
  { path: 'procedurePlan.strategy.pacing', label: 'Pacing Strategy' },
  { path: 'procedurePlan.strategy.bav', label: 'BAV Size' },
  { path: 'procedurePlan.strategy.closure', label: 'Closure Strategy' },
  { path: 'procedurePlan.goals', label: 'Procedural Goals' },

  { path: 'devicesPlanned', label: 'Planned Device' },
];

export class TAVIWorkupExtractor {
  static extract(transcript: string, options: ExtractionOptions = {}): ExtractionResult {
    const referenceDate = options.referenceDate ?? new Date();
    const lower = transcript.toLowerCase();

    const patient: TAVIWorkupPatient = {};
    const clinical: TAVIWorkupClinical = {};
    const laboratory: TAVIWorkupLaboratory = {};
    const ecg: TAVIWorkupECG = {};
    const echo: TAVIWorkupEchocardiography = {};
    const ctMeasurements: TAVIWorkupCTMeasurements = {
      coronaryHeights: {},
      sinusOfValsalva: {},
      coplanarAngles: [],
      accessVessels: {},
      aorticDimensions: {},
    };
    const procedurePlan: TAVIWorkupProcedurePlan = {
      valveSelection: {},
      access: {},
      strategy: {},
    };

    patient.name = this.extractName(transcript);
    const dob = this.extractDob(transcript);
    if (dob) {
      patient.dob = dob;
      const age = this.calculateAge(dob, referenceDate);
      if (!Number.isNaN(age)) {
        patient.ageYears = age;
      }
    } else {
      const ageMention = this.extractAgeWithoutDob(lower);
      if (ageMention != null) {
        patient.ageYears = ageMention;
      }
    }

    const height = this.extractMeasurement(lower, /\b(height|ht)\b[^\d]*(\d+[\d\s]*(?:\.\d+)?)/i);
    if (height != null) {
      const rounded = Math.round(height);
      patient.heightCm = rounded;
    }

    const weight = this.extractMeasurement(lower, /\b(weight|wt)\b[^\d]*(\d+(?:\.\d+)?)/i);
    if (weight != null) {
      const rounded = Math.round(weight);
      patient.weightKg = rounded;
    }

    if (patient.heightCm && patient.weightKg) {
      const heightM = patient.heightCm / 100;
      const bmi = patient.weightKg / (heightM * heightM);
      patient.bmi = Number(bmi.toFixed(1));
      const bsa = Math.sqrt((patient.heightCm * patient.weightKg) / 3600);
      patient.bsaMosteller = Number(bsa.toFixed(2));
    }

    if (lower.includes('nyha')) {
      const nyhaMatch = lower.match(/nyha(?:\s+class)?\s*(i{1,3}|iv|\d)/i);
      if (nyhaMatch) {
        const raw = nyhaMatch[1].toUpperCase();
        clinical.nyhaClass = ['I', 'II', 'III', 'IV'].includes(raw) ? (raw as any) : this.numberToRoman(raw);
      } else {
        const nyhaWordMatch = lower.match(/nyha(?:\s+class)?\s*(one|two|three|four)/i);
        if (nyhaWordMatch) {
          const mapped = this.wordsToNumber(nyhaWordMatch[1], false);
          if (mapped != null) {
            clinical.nyhaClass = this.numberToRoman(mapped.toString());
          }
        }
      }
    }

    const indication = this.extractIndication(transcript);
    if (indication) {
      clinical.indication = indication;
    }

    const stsValue = this.extractNumberAfter(lower, /sts(?:\s*score)?[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (stsValue != null) {
      clinical.stsPercent = Number(stsValue.toFixed(1));
    }

    const euroValue = this.extractNumberAfter(lower, /euro(?:score)?(?:\s*ii)?[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (euroValue != null) {
      clinical.euroScorePercent = Number(euroValue.toFixed(1));
    }

    // Laboratory values extraction
    const creatinineValue = this.extractNumberAfter(lower, /(?:cr|creatinine)[^\d]*(\d+(?:\.\d+)?)/i);
    if (creatinineValue != null) {
      laboratory.creatinine = Number(creatinineValue.toFixed(0));
    }

    const egfrValue = this.extractNumberAfter(lower, /(?:egfr|gfr)[^\d]*(\d+(?:\.\d+)?)/i);
    if (egfrValue != null) {
      laboratory.egfr = Number(egfrValue.toFixed(0));
    }

    const hemoglobinValue = this.extractNumberAfter(lower, /(?:hb|hemoglobin|haemoglobin)[^\d]*(\d+(?:\.\d+)?)/i);
    if (hemoglobinValue != null) {
      laboratory.hemoglobin = Number(hemoglobinValue.toFixed(0));
    }

    const albuminValue = this.extractNumberAfter(lower, /(?:alb|albumin)[^\d]*(\d+(?:\.\d+)?)/i);
    if (albuminValue != null) {
      laboratory.albumin = Number(albuminValue.toFixed(0));
    }

    // ECG parameters extraction
    const heartRateValue = this.extractNumberAfter(lower, /(?:rate|hr|heart rate)[^\d]*(\d+(?:\.\d+)?)/i);
    if (heartRateValue != null) {
      ecg.rate = Number(heartRateValue.toFixed(0));
    }

    // Rhythm extraction
    if (lower.includes('sinus rhythm') || lower.includes(' sr ')) {
      ecg.rhythm = 'SR';
    } else if (lower.includes('atrial fibrillation') || lower.includes(' af ')) {
      ecg.rhythm = 'AF';
    } else {
      const rhythmMatch = lower.match(/rhythm[^\w]*([a-z\s]+?)(?:\s|$|[.,;])/i);
      if (rhythmMatch) {
        ecg.rhythm = rhythmMatch[1].trim();
      }
    }

    // QRS morphology
    if (lower.includes('lbbb') || lower.includes('left bundle branch block')) {
      ecg.morphology = 'LBBB';
    } else if (lower.includes('rbbb') || lower.includes('right bundle branch block')) {
      ecg.morphology = 'RBBB';
    } else if (lower.includes('narrow') || lower.includes('narrow complex')) {
      ecg.morphology = 'narrow';
    } else if (lower.includes('wide') || lower.includes('wide complex')) {
      ecg.morphology = 'wide';
    }

    // QRS width
    const qrsWidthValue = this.extractNumberAfter(lower, /qrs[^\d]*(\d+(?:\.\d+)?)/i);
    if (qrsWidthValue != null) {
      ecg.qrsWidthMs = Number(qrsWidthValue.toFixed(0));
    }

    // PR interval
    const prIntervalValue = this.extractNumberAfter(lower, /pr[^\d]*(\d+(?:\.\d+)?)/i);
    if (prIntervalValue != null) {
      ecg.prIntervalMs = Number(prIntervalValue.toFixed(0));
    }

    const studyDate = this.extractDateAfter(transcript, /(echo|echocardiogram)\s*(?:on|dated|study date)?/i);
    if (studyDate) {
      echo.studyDate = studyDate;
    }

    const efValue = this.extractNumberAfter(lower, /(?:ef|ejection fraction)[^\d]*(\d+(?:\.\d+)?)/i);
    if (efValue != null) {
      echo.ejectionFractionPercent = Number(efValue.toFixed(0));
    }

    const septal = this.extractNumberAfter(lower, /septal(?:\s+thickness)?[^\d]*(\d+(?:\.\d+)?)/i);
    if (septal != null) {
      echo.septalThicknessMm = Number(septal.toFixed(1));
    }

    const meanGradient = this.extractNumberAfter(lower, /(mean\s+(?:pressure\s+)?gradient)[^\d]*(\d+(?:\.\d+)?)/i);
    if (meanGradient != null) {
      echo.meanGradientMmHg = Number(meanGradient.toFixed(1));
    }

    const ava = this.extractNumberAfter(lower, /(ava|aortic valve area)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (ava != null) {
      echo.aorticValveAreaCm2 = Number(ava.toFixed(2));
    }

    const dvi = this.extractNumberAfter(lower, /(dimensionless index|dvi)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (dvi != null) {
      echo.dimensionlessIndex = Number(dvi.toFixed(2));
    }

    const mrMatch =
      transcript.match(/mitral regurgitation\s*(grade)?\s*([\w\s+]+)/i) ||
      transcript.match(/\bMR\s*(\d\+?|trace|mild|moderate|severe|one(?:\s+plus)?|two(?:\s+plus)?|three(?:\s+plus)?|four(?:\s+plus)?)/i);
    if (mrMatch) {
      echo.mitralRegurgitationGrade = this.normalizeValveGrade(mrMatch[mrMatch.length - 1]);
    }

    const rvsp = this.extractNumberAfter(lower, /(rvsp|right ventricular systolic pressure)[^\d]*(\d+(?:\.\d+)?)/i);
    if (rvsp != null) {
      echo.rightVentricularSystolicPressureMmHg = Number(rvsp.toFixed(1));
    }

    const echoComments = this.extractSection(transcript, /(echo comments|echocardiography comments|echo findings)/i);
    if (echoComments) {
      echo.comments = echoComments;
    }

    this.extractCTMeasurements(transcript, lower, ctMeasurements);

    const coplanarMatch = transcript.match(/coplanar[^\n]*?(lao[^\n]+)/i);
    if (coplanarMatch && ctMeasurements.coplanarAngles.length === 0) {
      ctMeasurements.coplanarAngles = [coplanarMatch[1].replace(/\s+/g, ' ').trim().toUpperCase()];
    }

    // Procedure planning extraction
    this.extractProcedurePlan(transcript, lower, procedurePlan);

    const device = this.extractDevice(transcript);
    const data: TAVIWorkupData = {
      patient,
      clinical,
      laboratory,
      ecg,
      echocardiography: echo,
      ctMeasurements,
      procedurePlan,
      devicesPlanned: device ?? undefined,
    };

    const alerts = this.computeAlerts(data);
    const missingFields = this.computeMissingFields(data);

    return {
      data,
      alerts,
      missingFields,
    };
  }

  private static extractName(transcript: string): string | undefined {
    const match = transcript.match(/patient name\s*(?:is|:)?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/);
    return match ? match[1].trim() : undefined;
  }

  private static extractDob(transcript: string): string | undefined {
    const match = transcript.match(/(?:dob|date of birth)[:\s]*([\w\s,/-]+?)(?:\.|,|;|\n|$)/i);
    if (!match) return undefined;
    const raw = match[1].trim();
    const parsed = this.parseDateString(raw);
    return parsed ?? undefined;
  }

  private static extractAgeWithoutDob(lower: string): number | null {
    const ageMatch = lower.match(/(\d{2,3})[-\s]*year[-\s]*old/);
    if (ageMatch) {
      return parseInt(ageMatch[1], 10);
    }
    return null;
  }

  private static calculateAge(dobISO: string, reference: Date): number {
    const dob = new Date(dobISO);
    let age = reference.getFullYear() - dob.getFullYear();
    const monthDiff = reference.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  }

  private static extractMeasurement(text: string, regex: RegExp): number | null {
    const match = text.match(regex);
    if (!match) return null;
    const raw = match[2].replace(/\s+/g, '');
    const numeric = parseFloat(raw);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    const words = this.wordsToNumber(match[2]);
    return words;
  }

  private static extractIndication(transcript: string): string | undefined {
    const match = transcript.match(/indication\s*(?:is|:)?\s*([^\n.]+)/i);
    if (match) {
      return match[1].trim();
    }
    return undefined;
  }

  private static extractNumberAfter(text: string, regex: RegExp, allowDecimals = false): number | null {
    const match = text.match(regex);
    if (!match) return null;
    const candidate = match[match.length - 1];
    const numeric = parseFloat(candidate.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    const fromWords = this.wordsToNumber(candidate, allowDecimals);
    return fromWords;
  }

  private static extractNumberWithContext(text: string, regex: RegExp, allowDecimals = false): { value: number; context: string } | null {
    const execRegex = new RegExp(regex.source, regex.flags);
    const match = execRegex.exec(text);
    if (!match) return null;
    const candidate = match[match.length - 1];
    let value = parseFloat(candidate.replace(/[^\d.]/g, ''));
    if (Number.isNaN(value)) {
      const fromWords = this.wordsToNumber(candidate, allowDecimals);
      if (fromWords == null) return null;
      value = fromWords;
    }
    const contextStart = Math.max(0, match.index - 20);
    const contextEnd = Math.min(text.length, match.index + match[0].length + 20);
    const context = text.slice(contextStart, contextEnd);
    return { value, context };
  }

  private static extractDateAfter(transcript: string, regex: RegExp): string | undefined {
    const match = transcript.match(regex);
    if (!match) return undefined;
    const trailing = transcript.slice(match.index! + match[0].length).trim();
    const dateMatch = trailing.match(/([A-Za-z0-9/-]+(?:\s+[A-Za-z]+\s+\d{4})?)/);
    if (!dateMatch) return undefined;
    const parsed = this.parseDateString(dateMatch[1]);
    return parsed ?? undefined;
  }

  private static extractSection(transcript: string, regex: RegExp): string | undefined {
    const match = transcript.match(regex);
    if (!match) return undefined;
    const start = match.index! + match[0].length;
    const snippet = transcript.slice(start).split(/(?:\n\n|\n[A-Z])/)[0];
    const cleaned = snippet.trim();
    return cleaned.length > 0 ? cleaned : undefined;
  }

  private static extractCTMeasurements(original: string, lower: string, ct: TAVIWorkupCTMeasurements): void {
    const annulusArea = this.extractNumberWithContext(lower, /annulus[^\n]*area[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (annulusArea) {
      let value = annulusArea.value;
      if (/cm2|cm²|square\s+centimet/.test(annulusArea.context)) {
        value *= 100;
      }
      ct.annulusAreaMm2 = Number(value.toFixed(1));
    }

    const perimeter = this.extractNumberWithContext(lower, /perimeter[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (perimeter) {
      let value = perimeter.value;
      if (/cm(?!²|2)/.test(perimeter.context)) {
        value *= 10;
      }
      ct.annulusPerimeterMm = Number(value.toFixed(1));
    }

    const min = this.extractNumberWithContext(lower, /(minimum|min)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (min) {
      let value = min.value;
      if (/cm/.test(min.context)) {
        value *= 10;
      }
      ct.annulusMinDiameterMm = Number(value.toFixed(1));
    }

    const max = this.extractNumberWithContext(lower, /(maximum|max)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (max) {
      let value = max.value;
      if (/cm/.test(max.context)) {
        value *= 10;
      }
      ct.annulusMaxDiameterMm = Number(value.toFixed(1));
    }

    const leftMain = this.extractNumberWithContext(lower, /(left main height)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (leftMain) {
      let value = leftMain.value;
      if (/cm/.test(leftMain.context)) {
        value *= 10;
      }
      ct.coronaryHeights.leftMainMm = Number(value.toFixed(1));
    }

    const rightCor = this.extractNumberWithContext(lower, /(right coronary height)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (rightCor) {
      let value = rightCor.value;
      if (/cm/.test(rightCor.context)) {
        value *= 10;
      }
      ct.coronaryHeights.rightCoronaryMm = Number(value.toFixed(1));
    }

    const sovLeft = this.extractNumberWithContext(lower, /(sinus of valsalva left)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (sovLeft) {
      let value = sovLeft.value;
      if (/cm/.test(sovLeft.context)) {
        value *= 10;
      }
      ct.sinusOfValsalva.leftMm = Number(value.toFixed(1));
    }

    const sovRight = this.extractNumberWithContext(lower, /(sinus of valsalva right)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (sovRight) {
      let value = sovRight.value;
      if (/cm/.test(sovRight.context)) {
        value *= 10;
      }
      ct.sinusOfValsalva.rightMm = Number(value.toFixed(1));
    }

    const sovNon = this.extractNumberWithContext(lower, /(sinus of valsalva (?:non|nc))[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (sovNon) {
      let value = sovNon.value;
      if (/cm/.test(sovNon.context)) {
        value *= 10;
      }
      ct.sinusOfValsalva.nonCoronaryMm = Number(value.toFixed(1));
    }

    const sovBlockMatch = lower.match(/sinus of valsalva[^.\n]*/i);
    if (sovBlockMatch) {
      const block = sovBlockMatch[0];
      if (ct.sinusOfValsalva.leftMm == null) {
        const blockLeft = this.extractNumberWithContext(block, /left[^\d]*(\d+(?:\.\d+)?)/i, true);
        if (blockLeft) {
          let value = blockLeft.value;
          if (/cm/.test(blockLeft.context)) value *= 10;
          ct.sinusOfValsalva.leftMm = Number(value.toFixed(1));
        }
      }
      if (ct.sinusOfValsalva.rightMm == null) {
        const blockRight = this.extractNumberWithContext(block, /right[^\d]*(\d+(?:\.\d+)?)/i, true);
        if (blockRight) {
          let value = blockRight.value;
          if (/cm/.test(blockRight.context)) value *= 10;
          ct.sinusOfValsalva.rightMm = Number(value.toFixed(1));
        }
      }
      if (ct.sinusOfValsalva.nonCoronaryMm == null) {
        const blockNon = this.extractNumberWithContext(block, /(non|nc)[^\d]*(\d+(?:\.\d+)?)/i, true);
        if (blockNon) {
          let value = blockNon.value;
          if (/cm/.test(blockNon.context)) value *= 10;
          ct.sinusOfValsalva.nonCoronaryMm = Number(value.toFixed(1));
        }
      }
    }

    const anglesMatch = original.match(/\b(?:lao|rao)\s*\d+\s*(?:cranial|caudal)\s*\d+\b/gi);
    if (anglesMatch) {
      ct.coplanarAngles = anglesMatch.map(angle => angle.replace(/\s+/g, ' ').trim().toUpperCase());
    }

    const accessPatterns: Array<{ key: keyof TAVIWorkupCTMeasurements['accessVessels']; regex: RegExp }> = [
      { key: 'rightCIAmm', regex: /(right\s+(?:common\s+)?iliac)[^\d]*(\d+(?:\.\d+)?)/i },
      { key: 'leftCIAmm', regex: /(left\s+(?:common\s+)?iliac)[^\d]*(\d+(?:\.\d+)?)/i },
      { key: 'rightEIAmm', regex: /(right\s+external\s+iliac)[^\d]*(\d+(?:\.\d+)?)/i },
      { key: 'leftEIAmm', regex: /(left\s+external\s+iliac)[^\d]*(\d+(?:\.\d+)?)/i },
      { key: 'rightCFAmm', regex: /(right\s+common\s+femoral)[^\d]*(\d+(?:\.\d+)?)/i },
      { key: 'leftCFAmm', regex: /(left\s+common\s+femoral)[^\d]*(\d+(?:\.\d+)?)/i },
    ];

    for (const pattern of accessPatterns) {
      const match = this.extractNumberWithContext(lower, pattern.regex, true);
      if (match) {
        let value = match.value;
        if (/cm/.test(match.context)) {
          value *= 10;
        }
        ct.accessVessels[pattern.key] = Number(value.toFixed(1));
      }
    }

    // Enhanced LVOT measurements
    const lvotArea = this.extractNumberWithContext(lower, /(lvot|lvot area)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (lvotArea) {
      let value = lvotArea.value;
      if (/cm2|cm²|square\s+centimet/.test(lvotArea.context)) {
        value *= 100;
      }
      ct.lvotAreaMm2 = Number(value.toFixed(1));
    }

    const lvotPerim = this.extractNumberWithContext(lower, /(lvot.*perimeter|lvotperim)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (lvotPerim) {
      let value = lvotPerim.value;
      if (/cm(?!²|2)/.test(lvotPerim.context)) {
        value *= 10;
      }
      ct.lvotPerimeterMm = Number(value.toFixed(1));
    }

    const stjDiameter = this.extractNumberWithContext(lower, /(stj.*diameter|stjdim)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (stjDiameter) {
      let value = stjDiameter.value;
      if (/cm/.test(stjDiameter.context)) {
        value *= 10;
      }
      ct.stjDiameterMm = Number(value.toFixed(1));
    }

    const stjHeight = this.extractNumberWithContext(lower, /(stj.*height|stjh)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (stjHeight) {
      let value = stjHeight.value;
      if (/cm/.test(stjHeight.context)) {
        value *= 10;
      }
      ct.stjHeightMm = Number(value.toFixed(1));
    }

    // Calcium scoring
    const calciumScore = this.extractNumberWithContext(lower, /(calcium.*score|cascore)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (calciumScore) {
      ct.calciumScore = Number(calciumScore.value.toFixed(0));
    }

    const lvotCalcium = this.extractNumberWithContext(lower, /(lvot.*calcium)[^\d]*(\d+(?:\.\d+)?)/i, true);
    if (lvotCalcium) {
      ct.lvotCalciumScore = Number(lvotCalcium.value.toFixed(0));
    }

    // Additional aortic measurements (flexible for various measurements from your slide)
    const aorticPatterns = [
      { key: 'RFA', regex: /(rfa)[^\d]*(\d+(?:\.\d+)?)/i },
      { key: 'LFA', regex: /(lfa)[^\d]*(\d+(?:\.\d+)?)/i },
      { key: 'AORTA', regex: /(aorta)[^\d]*(\d+(?:\.\d+)?)/i },
    ];

    for (const pattern of aorticPatterns) {
      const match = this.extractNumberWithContext(lower, pattern.regex, true);
      if (match) {
        let value = match.value;
        if (/cm/.test(match.context)) {
          value *= 10;
        }
        ct.aorticDimensions![pattern.key] = Number(value.toFixed(1));
      }
    }
  }

  private static extractProcedurePlan(original: string, lower: string, plan: TAVIWorkupProcedurePlan): void {
    // Valve selection extraction based on your slide examples
    const valvePatterns = [
      { regex: /(\d+\s*mm)\s+(edwards|sapien|evolut|navitor|medtronic|boston|lotus)/i, typeGroup: 2, sizeGroup: 1 },
      { regex: /(edwards|sapien|evolut|navitor|medtronic|boston|lotus)\s+(\d+\s*mm)/i, typeGroup: 1, sizeGroup: 2 },
      { regex: /(edwards|sapien|evolut|navitor|medtronic|boston|lotus)/i, typeGroup: 1, sizeGroup: null },
    ];

    for (const pattern of valvePatterns) {
      const match = original.match(pattern.regex);
      if (match) {
        plan.valveSelection.type = match[pattern.typeGroup].trim();
        if (pattern.sizeGroup && match[pattern.sizeGroup]) {
          plan.valveSelection.size = match[pattern.sizeGroup].replace(/\s+/g, '').trim();
        }
        break;
      }
    }

    // Extract valve selection reason (e.g., "future coronary access")
    const reasonMatch = original.match(/reason[:\s]*([^\n.]+)/i);
    if (reasonMatch) {
      plan.valveSelection.reason = reasonMatch[1].trim();
    }

    // Primary access extraction
    const primaryAccessPatterns = [
      /primary access[:\s]*([^\n.,;]+)/i,
      /access[:\s]*([RF]FA|[RL]adial|femoral|radial)/i,
    ];

    for (const pattern of primaryAccessPatterns) {
      const match = original.match(pattern);
      if (match) {
        plan.access.primary = match[1].trim();
        break;
      }
    }

    // Secondary access extraction
    const secondaryMatch = original.match(/secondary access[:\s]*([^\n.,;]+)/i);
    if (secondaryMatch) {
      plan.access.secondary = secondaryMatch[1].trim();
    }

    // Wire selection
    const wireMatch = original.match(/wire[:\s]*(confida|safari|lunderquist|amplatz|[^\n.,;]+)/i);
    if (wireMatch) {
      plan.access.wire = wireMatch[1].trim();
    }

    // Pacing strategy
    const pacingMatch = original.match(/pacing[:\s]*([^\n.,;]+)/i);
    if (pacingMatch) {
      plan.strategy.pacing = pacingMatch[1].trim();
    }

    // BAV size extraction
    const bavMatch = original.match(/bav[:\s]*(\d+\s*mm|not planned|none)/i);
    if (bavMatch) {
      plan.strategy.bav = bavMatch[1].trim();
    }

    // Closure strategy
    const closureMatch = original.match(/closure[:\s]*([^\n.,;]+)/i);
    if (closureMatch) {
      plan.strategy.closure = closureMatch[1].trim();
    }

    // Protamine requirement
    if (lower.includes('protamine') && (lower.includes('required') || lower.includes('if required'))) {
      plan.strategy.protamine = true;
    } else if (lower.includes('protamine') && (lower.includes('not required') || lower.includes('none'))) {
      plan.strategy.protamine = false;
    }

    // Procedural goals
    const goalsMatch = original.match(/goals?[:\s]*([^\n.]+)/i);
    if (goalsMatch) {
      plan.goals = goalsMatch[1].trim();
    }

    // Case notes (e.g., "Future PCI to LAD; consider guide picture at end")
    const notesPatterns = [
      /case notes?[:\s]*([^\n]+)/i,
      /notes?[:\s]*([^\n]+)/i,
      /consider[:\s]*([^\n]+)/i,
    ];

    for (const pattern of notesPatterns) {
      const match = original.match(pattern);
      if (match) {
        plan.caseNotes = match[1].trim();
        break;
      }
    }
  }

  private static extractDevice(transcript: string): string | undefined {
    const match = transcript.match(/plan(?:ned)?\s*[:]?\s*(.+)/i);
    if (!match) return undefined;
    const phrase = match[1].split(/[\n.]/)[0];
    const lower = phrase.toLowerCase();
    for (const device of DEVICE_WHITELIST) {
      if (lower.includes(device)) {
        const sizeMatch = phrase.match(/(\d+\s*mm)/i);
        const cleanedDevice = device.charAt(0).toUpperCase() + device.slice(1);
        return sizeMatch ? `${sizeMatch[1].replace(/\s+/g, ' ')} ${cleanedDevice}` : cleanedDevice;
      }
    }
    return undefined;
  }

  private static computeAlerts(data: TAVIWorkupData): TAVIWorkupAlerts {
    const alertMessages: string[] = [];
    const lowSinus: string[] = [];
    const smallAccess: string[] = [];
    let lowLeftMain = false;

    // Laboratory value alerts (clinical thresholds)
    if (data.laboratory.egfr != null && data.laboratory.egfr < 30) {
      alertMessages.push(`Severe renal impairment (eGFR ${data.laboratory.egfr} mL/min/1.73m²) - contrast nephropathy risk.`);
    } else if (data.laboratory.egfr != null && data.laboratory.egfr < 60) {
      alertMessages.push(`Moderate renal impairment (eGFR ${data.laboratory.egfr} mL/min/1.73m²) - consider contrast limitation.`);
    }

    if (data.laboratory.hemoglobin != null && data.laboratory.hemoglobin < 100) {
      alertMessages.push(`Anaemia (Hb ${data.laboratory.hemoglobin} g/L) - bleeding risk considerations.`);
    }

    if (data.laboratory.albumin != null && data.laboratory.albumin < 30) {
      alertMessages.push(`Hypoalbuminaemia (${data.laboratory.albumin} g/L) - nutritional/frailty concerns.`);
    }

    // ECG alerts
    if (data.ecg.rhythm === 'AF' || data.ecg.rhythm === 'atrial fibrillation') {
      alertMessages.push('Atrial fibrillation - anticoagulation strategy consideration.');
    }

    if (data.ecg.qrsWidthMs != null && data.ecg.qrsWidthMs > 120) {
      alertMessages.push(`Wide QRS complex (${data.ecg.qrsWidthMs} ms) - consider His bundle assessment and pacing requirements.`);
    }

    if (data.ecg.morphology === 'LBBB') {
      alertMessages.push('Left bundle branch block - increased risk of high-degree AV block post-TAVI.');
    }

    // CT measurement alerts (existing)
    const leftMain = data.ctMeasurements.coronaryHeights.leftMainMm;
    if (leftMain != null && leftMain < 10) {
      lowLeftMain = true;
      alertMessages.push('Left main coronary height is below 10 mm.');
    }

    const sinusEntries: Array<[string, number | undefined]> = [
      ['Left', data.ctMeasurements.sinusOfValsalva.leftMm],
      ['Right', data.ctMeasurements.sinusOfValsalva.rightMm],
      ['Non-coronary', data.ctMeasurements.sinusOfValsalva.nonCoronaryMm],
    ];
    for (const [label, value] of sinusEntries) {
      if (value != null && value < 30) {
        lowSinus.push(label);
      }
    }
    if (lowSinus.length > 0) {
      alertMessages.push(`Sinus of Valsalva diameter below 30 mm: ${lowSinus.join(', ')}.`);
    }

    const accessMap: Array<[string, number | undefined]> = [
      ['Right CIA', data.ctMeasurements.accessVessels.rightCIAmm],
      ['Left CIA', data.ctMeasurements.accessVessels.leftCIAmm],
      ['Right EIA', data.ctMeasurements.accessVessels.rightEIAmm],
      ['Left EIA', data.ctMeasurements.accessVessels.leftEIAmm],
      ['Right CFA', data.ctMeasurements.accessVessels.rightCFAmm],
      ['Left CFA', data.ctMeasurements.accessVessels.leftCFAmm],
    ];
    for (const [label, value] of accessMap) {
      if (value != null && value < 6) {
        smallAccess.push(label);
      }
    }
    if (smallAccess.length > 0) {
      alertMessages.push(`Access vessel diameter below 6 mm: ${smallAccess.join(', ')}.`);
    }

    if (alertMessages.length === 0) {
      alertMessages.push('None.');
    }

    return {
      alertMessages,
      triggers: {
        lowLeftMainHeight: lowLeftMain,
        lowSinusDiameters: lowSinus,
        smallAccessVessels: smallAccess,
      },
    };
  }

  private static computeMissingFields(data: TAVIWorkupData): string[] {
    const missing: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      const value = this.getValueAtPath(data, field.path);
      if (value == null || (typeof value === 'number' && Number.isNaN(value)) || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim().length === 0)) {
        missing.push(field.label);
      }
    }
    return missing;
  }

  private static getValueAtPath(data: TAVIWorkupData, path: string): any {
    return path.split('.').reduce<any>((acc, key) => {
      if (acc == null) return undefined;
      return acc[key as keyof typeof acc];
    }, data as any);
  }

  private static normalizeValveGrade(raw: string): string {
    const cleaned = raw.trim().toLowerCase();
    const map: Record<string, string> = {
      'trace': 'trace',
      'trivial': 'trace',
      'mild': '1+',
      'moderate': '2+',
      'severe': '4+',
      'mod-severe': '3+',
      'mod': '2+',
      'two': '2+',
      'two+': '2+',
      'two-plus': '2+',
      'three': '3+',
      'four': '4+',
      '1+': '1+',
      '2+': '2+',
      '3+': '3+',
      '4+': '4+',
    };

    if (map[cleaned]) return map[cleaned];
    const number = this.wordsToNumber(cleaned, true);
    if (number != null) {
      return `${number}+`;
    }
    if (/\d\+/.test(cleaned)) {
      return cleaned;
    }
    return raw.trim();
  }

  private static wordsToNumber(value: string, allowDecimals = false): number | null {
    let normalized = value.trim().toLowerCase();
    normalized = normalized.replace(/\+/g, '');
    normalized = normalized.replace(/-/g, ' ');
    normalized = normalized.replace(/\bplus\b/g, '');

    if (normalized.includes('point')) {
      if (!allowDecimals) return null;
      const [wholePart, fractionalPart] = normalized.split('point').map(part => part.trim());
      const wholeValue = this.wordsToNumber(wholePart) ?? 0;
      const fractionalDigits = fractionalPart.split(/\s+/).map(word => NUMBER_WORDS[word] ?? TENS_WORDS[word] ?? '').join('');
      const parsedFraction = fractionalDigits.length > 0 ? parseInt(fractionalDigits, 10) : 0;
      const divisor = Math.pow(10, fractionalDigits.length);
      return wholeValue + parsedFraction / (divisor || 1);
    }

    if (/^\d+(?:\.\d+)?$/.test(normalized)) {
      return parseFloat(normalized);
    }

    const tokens = normalized.split(/\s+/).filter(Boolean);

    if (tokens.length >= 3 && tokens[0] === 'one' && TENS_WORDS[tokens[1]] != null) {
      const remainderValue = this.wordsToNumber(tokens.slice(1).join(' '), allowDecimals);
      if (remainderValue != null) {
        return 100 + remainderValue;
      }
    }
    let total = 0;
    let current = 0;

    for (const token of tokens) {
      if (NUMBER_WORDS[token] != null) {
        current += NUMBER_WORDS[token];
      } else if (TENS_WORDS[token] != null) {
        current += TENS_WORDS[token];
      } else if (token === 'hundred') {
        current *= 100;
      } else if (token === 'thousand') {
        current *= 1000;
        total += current;
        current = 0;
      } else if (token.length === 0) {
        continue;
      } else {
        return null;
      }
    }
    return total + current;
  }

  private static numberToRoman(value: string): 'I' | 'II' | 'III' | 'IV' {
    const numeric = parseInt(value, 10);
    switch (numeric) {
      case 1:
        return 'I';
      case 2:
        return 'II';
      case 3:
        return 'III';
      default:
        return 'IV';
    }
  }

  private static parseDateString(raw: string): string | null {
    const cleaned = raw.trim().replace(/(st|nd|rd|th)/gi, '');
    const isoMatch = cleaned.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const slashMatch = cleaned.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (slashMatch) {
      const [ , day, month, yearStr ] = slashMatch;
      let year = yearStr;
      if (year.length === 2) {
        year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
      }
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const textMatch = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (textMatch) {
      const [, day, monthName, year] = textMatch;
      const monthIndex = this.monthNameToNumber(monthName);
      if (monthIndex) {
        return `${year}-${monthIndex}-${day.padStart(2, '0')}`;
      }
    }

    return null;
  }

  private static monthNameToNumber(name: string): string | null {
    const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const index = months.indexOf(name.toLowerCase());
    if (index === -1) return null;
    const monthNumber = (index + 1).toString().padStart(2, '0');
    return monthNumber;
  }
}
