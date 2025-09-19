import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TAVIWorkupAgent } from '@/agents/specialized/TAVIWorkupAgent';
import { TAVIWorkupExtractor } from '@/utils/text-extraction/TAVIWorkupExtractor';

const mockProcessWithAgent = vi.fn();

vi.mock('@/services/LMStudioService', () => {
  return {
    LMStudioService: {
      getInstance: vi.fn(() => ({
        processWithAgent: mockProcessWithAgent,
      })),
    },
  };
});

describe('TAVIWorkupExtractor', () => {
  const sampleTranscript = `
Seventy-eight year old male. DOB 12 May 1946. Height 172 centimetres, weight 79 kilograms. NYHA class three.
STS 4.7 percent, EuroSCORE II 2.1 percent.
Echo today: EF 55. Septal thickness 10 millimetres. Mean gradient 40. AVA 0.8 square centimetres. DVI 0.25. MR two plus. RVSP 30.
CT: annulus area 432 square millimetres, perimeter 73 millimetres. Minimum 21.5 millimetres, maximum 25.2 millimetres. Left main height 11.8 mm, right coronary height 11 mm. Sinus of Valsalva left 29 mm, right 31 mm, non 28 mm. Coplanar LAO 12 cranial 6. Right external iliac 5.8 mm.
Plan: 27 mm Navitor.
`;

  it('normalises key measurements and computes derived metrics', () => {
    const { data, alerts, missingFields } = TAVIWorkupExtractor.extract(sampleTranscript, {
      referenceDate: new Date('2024-06-01')
    });

    expect(data.patient.dob).toBe('1946-05-12');
    expect(data.patient.ageYears).toBe(78);
    expect(data.patient.heightCm).toBe(172);
    expect(data.patient.weightKg).toBe(79);
    expect(data.patient.bmi).toBeCloseTo(26.7, 1);
    expect(data.patient.bsaMosteller).toBeCloseTo(1.94, 2);

    expect(data.clinical.nyhaClass).toBe('III');
    expect(data.clinical.stsPercent).toBeCloseTo(4.7, 1);
    expect(data.clinical.euroScorePercent).toBeCloseTo(2.1, 1);

    expect(data.echocardiography.aorticValveAreaCm2).toBeCloseTo(0.8, 1);
    expect(data.echocardiography.dimensionlessIndex).toBeCloseTo(0.25, 2);
    expect(data.echocardiography.mitralRegurgitationGrade).toBe('2+');

    expect(data.ctMeasurements.annulusAreaMm2).toBeCloseTo(432, 1);
    expect(data.ctMeasurements.annulusPerimeterMm).toBeCloseTo(73, 1);
    expect(data.ctMeasurements.annulusMinDiameterMm).toBeCloseTo(21.5, 1);
    expect(data.ctMeasurements.annulusMaxDiameterMm).toBeCloseTo(25.2, 1);
    expect(data.ctMeasurements.coronaryHeights.leftMainMm).toBeCloseTo(11.8, 1);
    expect(data.ctMeasurements.coronaryHeights.rightCoronaryMm).toBeCloseTo(11, 1);
    expect(data.ctMeasurements.sinusOfValsalva.leftMm).toBeCloseTo(29, 1);
    expect(data.ctMeasurements.sinusOfValsalva.rightMm).toBeCloseTo(31, 1);
    expect(data.ctMeasurements.sinusOfValsalva.nonCoronaryMm).toBeCloseTo(28, 1);
    expect(data.ctMeasurements.coplanarAngles).toContain('LAO 12 CRANIAL 6');
    expect(data.ctMeasurements.accessVessels.rightEIAmm).toBeCloseTo(5.8, 1);

    expect(alerts.triggers.lowLeftMainHeight).toBe(false);
    expect(alerts.triggers.lowSinusDiameters).toEqual(['Left', 'Non-coronary']);
    expect(alerts.triggers.smallAccessVessels).toEqual(['Right EIA']);
    expect(alerts.alertMessages.some(msg => msg.includes('Access vessel'))).toBe(true);

    expect(missingFields).toContain('Echo Study Date');
    expect(missingFields).toContain('Echo Comments');
    expect(missingFields).not.toContain('Annulus Area (mm²)');
  });
});

describe('TAVIWorkupAgent', () => {
  const MOCK_OUTPUT = `Patient\nStructured content here\n\nClinical\nDetails\n\nEchocardiography\nDetails\n\nCT Measurements\nDetails\n\nDevices Planned\nDetails\n\nAlerts & Anatomical Considerations\nNone.\n\nMissing / Not Stated\nEcho Study Date; Echo Comments; Coplanar Angles`;

  beforeEach(() => {
    mockProcessWithAgent.mockReset();
    mockProcessWithAgent.mockResolvedValue(MOCK_OUTPUT);
  });

  it('passes structured payload to LM Studio and returns enriched report', async () => {
    const agent = new TAVIWorkupAgent();
    const transcription = 'DOB 12/05/1946. Height 172 cm. Weight 79 kg. STS 4.7 percent. Euro 2.1 percent.';

    const report = await agent.process(transcription);

    expect(mockProcessWithAgent).toHaveBeenCalledTimes(1);
    const [, payload] = mockProcessWithAgent.mock.calls[0];
    const parsed = JSON.parse(payload);

    expect(parsed.structured_data.patient.dob).toBe('1946-05-12');
    expect(parsed.structured_data.patient.height_cm).toContain('172');
    expect(parsed.missing_fields).toContain('Echo Study Date');

    expect(report.content).toContain('Patient');
    expect(report.content).toContain('Clinical');
    expect(report.content).toContain('Missing / Not Stated');
    expect(report.workupData.patient.heightCm).toBe(172);
    expect(report.alerts.alertMessages).toBeDefined();
    expect(report.missingFields).toContain('Echo Study Date');
    expect(report.metadata.missingInformation?.missing_structured).toEqual(report.missingFields);
  });

  describe('Enhanced XML Structured Output', () => {
    it('parses XML structured response correctly', async () => {
      const xmlOutput = `
        <report>
        <section title="Patient">John Doe, DOB 12/05/1946, age 78 years, height 172 cm, weight 79 kg, BMI 26.7, BSA 1.94 m²</section>
        <section title="Clinical">NYHA Class III, STS Score 4.7%, EuroSCORE II 2.1%</section>
        <section title="Background">No background provided</section>
        <section title="Medications (Problem List)">No medications listed</section>
        <section title="Social History">Not available</section>
        <section title="Investigation Summary">Not available</section>
        <section title="Echocardiography">EF 55%, AVA 0.8 cm², mean gradient 40 mmHg</section>
        <section title="CT Measurements">Annulus area 432 mm², left main height 11.8 mm</section>
        <section title="Devices Planned">27 mm Navitor</section>
        <section title="Alerts & Anatomical Considerations">Sinus of Valsalva diameter below 30 mm: Left, Non-coronary; Access vessel diameter below 6 mm: Right EIA</section>
        <section title="Missing / Not Stated">Echo Study Date; Echo Comments</section>
        </report>
      `;

      mockProcessWithAgent.mockResolvedValue(xmlOutput);
      const agent = new TAVIWorkupAgent();
      const report = await agent.process('Test input');

      expect(report.content).toContain('Patient\n\nJohn Doe, DOB 12/05/1946');
      expect(report.content).toContain('Clinical\n\nNYHA Class III');
      expect(report.content).toContain('Background\n\nNo background provided');
      expect(report.content).toContain('Medications (Problem List)\n\nNo medications listed');
      expect(report.content).toContain('Social History\n\nNot available');
      expect(report.content).toContain('Investigation Summary\n\nNot available');
      expect(report.content).toContain('Echocardiography\n\nEF 55%');
      expect(report.content).toContain('CT Measurements\n\nAnnulus area 432 mm²');
      expect(report.content).toContain('Devices Planned\n\n27 mm Navitor');
      expect(report.content).toContain('Alerts & Anatomical Considerations\n\nSinus of Valsalva');
      expect(report.content).toContain('Missing / Not Stated\n\nEcho Study Date');

      // Verify proper section spacing - each section should have heading followed by content with line breaks
      const lines = report.content.split('\n');
      const patientIndex = lines.findIndex(line => line === 'Patient');
      expect(lines[patientIndex + 1]).toBe(''); // Empty line after heading
      expect(lines[patientIndex + 2]).toContain('John Doe'); // Content
    });

    it('falls back to legacy parsing when XML parsing fails', async () => {
      const legacyOutput = `Patient\nLegacy format content\n\nClinical\nLegacy clinical content`;

      mockProcessWithAgent.mockResolvedValue(legacyOutput);
      const agent = new TAVIWorkupAgent();
      const report = await agent.process('Test input');

      expect(report.content).toContain('Patient\n\nLegacy format content');
      expect(report.content).toContain('Clinical\n\nLegacy clinical content');
    });

    it('provides deterministic fallback when all parsing fails', async () => {
      const malformedOutput = 'This is completely malformed output with no structure';

      mockProcessWithAgent.mockResolvedValue(malformedOutput);
      const agent = new TAVIWorkupAgent();
      const report = await agent.process('Test input');

      expect(report.content).toContain('TAVI Workup Summary');
      expect(report.content).toContain('malformed output');
    });
  });

  describe('EMR Dialog Field Integration', () => {
    const mockChrome = {
      runtime: {
        sendMessage: vi.fn()
      }
    };

    beforeEach(() => {
      // Mock chrome API
      global.chrome = mockChrome as any;
      mockChrome.runtime.sendMessage.mockReset();
    });

    it('extracts and includes EMR fields in payload', async () => {
      // Mock EMR field responses
      mockChrome.runtime.sendMessage
        .mockResolvedValueOnce({ data: 'Patient has diabetes and hypertension' }) // background
        .mockResolvedValueOnce({ data: 'Echo shows severe AS, CT shows bicuspid valve' }) // investigation-summary
        .mockResolvedValueOnce({ data: 'Metoprolol 50mg BD, Atorvastatin 20mg' }) // medications
        .mockResolvedValueOnce({ data: 'Retired teacher, lives with spouse' }); // social-history

      const agent = new TAVIWorkupAgent();
      await agent.process('Test transcription');

      // Verify EMR extraction calls were made
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(4);
      expect(mockChrome.runtime.sendMessage).toHaveBeenNthCalledWith(1, {
        type: 'EXECUTE_ACTION',
        action: 'background',
        data: { extractOnly: true }
      });
      expect(mockChrome.runtime.sendMessage).toHaveBeenNthCalledWith(2, {
        type: 'EXECUTE_ACTION',
        action: 'investigation-summary',
        data: { extractOnly: true }
      });
      expect(mockChrome.runtime.sendMessage).toHaveBeenNthCalledWith(3, {
        type: 'EXECUTE_ACTION',
        action: 'medications',
        data: { extractOnly: true }
      });
      expect(mockChrome.runtime.sendMessage).toHaveBeenNthCalledWith(4, {
        type: 'EXECUTE_ACTION',
        action: 'social-history',
        data: { extractOnly: true }
      });

      // Verify EMR data was included in LLM payload
      const [, payload] = mockProcessWithAgent.mock.calls[0];
      const parsed = JSON.parse(payload);

      expect(parsed.emr_fields.background).toBe('Patient has diabetes and hypertension');
      expect(parsed.emr_fields.investigation_summary).toBe('Echo shows severe AS, CT shows bicuspid valve');
      expect(parsed.emr_fields.medications_problem_list).toBe('Metoprolol 50mg BD, Atorvastatin 20mg');
      expect(parsed.emr_fields.social_history).toBe('Retired teacher, lives with spouse');
    });

    it('handles EMR extraction failures gracefully', async () => {
      // Mock failed EMR extraction
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('EMR not available'));

      const agent = new TAVIWorkupAgent();
      const report = await agent.process('Test transcription');

      // Should still process successfully
      expect(report.content).toBeDefined();

      // Payload should have fallback values
      const [, payload] = mockProcessWithAgent.mock.calls[0];
      const parsed = JSON.parse(payload);

      expect(parsed.emr_fields.background).toBe('Not available');
      expect(parsed.emr_fields.investigation_summary).toBe('Not available');
      expect(parsed.emr_fields.medications_problem_list).toBe('Not available');
      expect(parsed.emr_fields.social_history).toBe('Not available');
    });
  });

  describe('Missing Fields UI Integration', () => {
    it('populates missing_structured for MissingInfoPanel integration', async () => {
      const inputWithMissingData = 'Height 172 cm. Weight 79 kg.'; // Missing most required fields

      const agent = new TAVIWorkupAgent();
      const report = await agent.process(inputWithMissingData);

      // Verify missing fields are detected
      expect(report.missingFields.length).toBeGreaterThan(0);
      expect(report.missingFields).toContain('Patient Name');
      expect(report.missingFields).toContain('Date of Birth');
      expect(report.missingFields).toContain('Echo Study Date');

      // Verify metadata is correctly populated for MissingInfoPanel
      expect(report.metadata.missingInformation?.missing_structured).toEqual(report.missingFields);
      expect(Array.isArray(report.metadata.missingInformation?.missing_structured)).toBe(true);
    });

    it('validates warnings and alerts thresholds remain correct', async () => {
      const inputWithAlerts = `
        DOB 12/05/1946. Height 172 cm. Weight 79 kg.
        Left main height 8 mm, right coronary height 11 mm.
        Sinus of Valsalva left 25 mm, right 27 mm, non 28 mm.
        Right external iliac 5.2 mm, left common femoral 5.8 mm.
      `;

      const agent = new TAVIWorkupAgent();
      const report = await agent.process(inputWithAlerts);

      // Verify alerts are triggered correctly
      expect(report.alerts.triggers.lowLeftMainHeight).toBe(true); // 8mm < 10mm threshold
      expect(report.alerts.triggers.lowSinusDiameters).toContain('Left'); // 25mm < 30mm
      expect(report.alerts.triggers.lowSinusDiameters).toContain('Right'); // 27mm < 30mm
      expect(report.alerts.triggers.smallAccessVessels).toContain('Right EIA'); // 5.2mm < 6mm
      expect(report.alerts.triggers.smallAccessVessels).toContain('Left CFA'); // 5.8mm < 6mm

      expect(report.alerts.alertMessages.length).toBeGreaterThan(0);
      expect(report.alerts.alertMessages.some(msg => msg.includes('Left main coronary height is below 10 mm'))).toBe(true);
      expect(report.alerts.alertMessages.some(msg => msg.includes('Sinus of Valsalva diameter below 30 mm'))).toBe(true);
      expect(report.alerts.alertMessages.some(msg => msg.includes('Access vessel diameter below 6 mm'))).toBe(true);
    });
  });

  describe('Processing Error Handling', () => {
    it('provides structured error output when processing fails', async () => {
      mockProcessWithAgent.mockRejectedValue(new Error('LLM service unavailable'));

      const agent = new TAVIWorkupAgent();
      const report = await agent.process('Test input');

      expect(report.content).toContain('Processing Error');
      expect(report.content).toContain('TAVI workup processing failed');
      expect(report.sections.length).toBeGreaterThan(0);
      expect(report.sections[0].title).toBe('Processing Error');
      expect(report.missingFields).toEqual([]);
      expect(report.alerts.alertMessages).toContain('Processing error.');
    });
  });

  describe('Enhanced Clinical Field Extraction', () => {
    it('extracts comprehensive laboratory values', () => {
      const transcript = `
        Patient details: John Doe, DOB 12/05/1946, height 172 cm, weight 79 kg.
        Laboratory: CR 65, eGFR 43, Hb 109, albumin 35.
        Echo shows severe AS.
      `;

      const { data } = TAVIWorkupExtractor.extract(transcript);

      expect(data.laboratory.creatinine).toBe(65);
      expect(data.laboratory.egfr).toBe(43);
      expect(data.laboratory.hemoglobin).toBe(109);
      expect(data.laboratory.albumin).toBe(35);
    });

    it('extracts ECG parameters correctly', () => {
      const transcript = `
        Patient: John Doe, DOB 12/05/1946.
        ECG: Rate 65, sinus rhythm, narrow complex, QRS 90 ms, PR 180 ms.
      `;

      const { data } = TAVIWorkupExtractor.extract(transcript);

      expect(data.ecg.rate).toBe(65);
      expect(data.ecg.rhythm).toBe('sinus rhythm');
      expect(data.ecg.morphology).toBe('narrow');
      expect(data.ecg.qrsWidthMs).toBe(90);
      expect(data.ecg.prIntervalMs).toBe(180);
    });

    it('extracts enhanced CT measurements', () => {
      const transcript = `
        CT: Annulus area 432 mm², LVOT area 340 mm², STJ diameter 24 mm, calcium score 3807.
        LVOT perimeter 68 mm, STJ height 15 mm, LVOT calcium 200.
        RFA 8 mm, LFA 8 mm.
      `;

      const { data } = TAVIWorkupExtractor.extract(transcript);

      expect(data.ctMeasurements.lvotAreaMm2).toBe(340);
      expect(data.ctMeasurements.lvotPerimeterMm).toBe(68);
      expect(data.ctMeasurements.stjDiameterMm).toBe(24);
      expect(data.ctMeasurements.stjHeightMm).toBe(15);
      expect(data.ctMeasurements.calciumScore).toBe(3807);
      expect(data.ctMeasurements.lvotCalciumScore).toBe(200);
      expect(data.ctMeasurements.aorticDimensions?.RFA).toBe(8);
      expect(data.ctMeasurements.aorticDimensions?.LFA).toBe(8);
    });

    it('extracts comprehensive procedure planning', () => {
      const transcript = `
        Plan: 26mm Edwards +2. Reason: future coronary access.
        Primary access: RFA. Secondary access: Right radial artery.
        Wire: Confida. Pacing: Femoral venous. BAV: 20mm Valve.
        Closure: ProStyle + AngioSeal. Protamine: If required.
        Goals: Suitable for OT. Case notes: Future PCI to LAD; consider guide picture at end.
      `;

      const { data } = TAVIWorkupExtractor.extract(transcript);

      expect(data.procedurePlan.valveSelection.type).toBe('Edwards');
      expect(data.procedurePlan.valveSelection.size).toBe('26mm');
      expect(data.procedurePlan.valveSelection.reason).toBe('future coronary access');
      expect(data.procedurePlan.access.primary).toBe('RFA');
      expect(data.procedurePlan.access.secondary).toBe('Right radial artery');
      expect(data.procedurePlan.access.wire).toBe('Confida');
      expect(data.procedurePlan.strategy.pacing).toBe('Femoral venous');
      expect(data.procedurePlan.strategy.bav).toBe('20mm Valve');
      expect(data.procedurePlan.strategy.closure).toBe('ProStyle + AngioSeal');
      expect(data.procedurePlan.strategy.protamine).toBe(true);
      expect(data.procedurePlan.goals).toBe('Suitable for OT');
      expect(data.procedurePlan.caseNotes).toBe('Future PCI to LAD; consider guide picture at end');
    });
  });

  describe('Enhanced Clinical Alerts', () => {
    it('generates laboratory value alerts for clinical thresholds', () => {
      const transcript = `
        Patient: John Doe, DOB 12/05/1946, height 172 cm, weight 79 kg.
        Laboratory: eGFR 25, hemoglobin 85, albumin 25.
      `;

      const { alerts } = TAVIWorkupExtractor.extract(transcript);

      expect(alerts.alertMessages.some(msg => msg.includes('Severe renal impairment'))).toBe(true);
      expect(alerts.alertMessages.some(msg => msg.includes('Anaemia'))).toBe(true);
      expect(alerts.alertMessages.some(msg => msg.includes('Hypoalbuminaemia'))).toBe(true);
    });

    it('generates ECG alerts for rhythm and conduction abnormalities', () => {
      const transcript = `
        Patient: John Doe, DOB 12/05/1946.
        ECG: Atrial fibrillation, QRS 140 ms, LBBB morphology.
      `;

      const { alerts } = TAVIWorkupExtractor.extract(transcript);

      expect(alerts.alertMessages.some(msg => msg.includes('Atrial fibrillation'))).toBe(true);
      expect(alerts.alertMessages.some(msg => msg.includes('Wide QRS complex'))).toBe(true);
      expect(alerts.alertMessages.some(msg => msg.includes('Left bundle branch block'))).toBe(true);
    });

    it('maintains existing CT measurement alert thresholds', () => {
      const transcript = `
        Patient: John Doe, DOB 12/05/1946, height 172 cm, weight 79 kg.
        Left main height 8 mm, right coronary height 11 mm.
        Sinus of Valsalva left 25 mm, right 27 mm, non 28 mm.
        Right external iliac 5.2 mm, left common femoral 5.8 mm.
      `;

      const { alerts } = TAVIWorkupExtractor.extract(transcript);

      expect(alerts.triggers.lowLeftMainHeight).toBe(true);
      expect(alerts.triggers.lowSinusDiameters).toContain('Left');
      expect(alerts.triggers.lowSinusDiameters).toContain('Right');
      expect(alerts.triggers.smallAccessVessels).toContain('Right EIA');
      expect(alerts.triggers.smallAccessVessels).toContain('Left CFA');
    });
  });

  describe('Comprehensive Field Validation', () => {
    it('validates all new required fields are included in missing fields detection', () => {
      const inputWithMissingData = 'Height 172 cm. Weight 79 kg.'; // Missing most fields

      const { missingFields } = TAVIWorkupExtractor.extract(inputWithMissingData);

      // Laboratory fields
      expect(missingFields).toContain('Creatinine (μmol/L)');
      expect(missingFields).toContain('eGFR (mL/min/1.73m²)');
      expect(missingFields).toContain('Hemoglobin (g/L)');
      expect(missingFields).toContain('Albumin (g/L)');

      // ECG fields
      expect(missingFields).toContain('Heart Rate (bpm)');
      expect(missingFields).toContain('Cardiac Rhythm');
      expect(missingFields).toContain('QRS Morphology');

      // Enhanced CT fields
      expect(missingFields).toContain('LVOT Area (mm²)');
      expect(missingFields).toContain('Calcium Score');

      // Procedure planning fields
      expect(missingFields).toContain('Valve Type');
      expect(missingFields).toContain('Primary Access');
    });

    it('integrates all enhanced fields in structured output', async () => {
      const comprehensiveInput = `
        Patient: John Doe, DOB 12/05/1946, age 78 years, height 172 cm, weight 79 kg.
        Laboratory: CR 65, eGFR 43, Hb 109, albumin 35.
        ECG: Rate 65, sinus rhythm, narrow complex, QRS 90 ms, PR 180 ms.
        Echo: EF 55%, AVA 0.8 cm², mean gradient 40 mmHg.
        CT: Annulus area 432 mm², LVOT area 340 mm², calcium score 3807.
        Plan: 26mm Edwards. Primary access: RFA. Wire: Confida. Goals: Suitable for OT.
      `;

      const xmlOutput = `
        <report>
        <section title="Patient">John Doe, DOB 12/05/1946, age 78 years, height 172 cm, weight 79 kg, BMI 26.7, BSA 1.94 m²</section>
        <section title="Clinical">No clinical data provided</section>
        <section title="Laboratory Values">Creatinine 65 μmol/L, eGFR 43 mL/min/1.73m² (moderate impairment), Hemoglobin 109 g/L, Albumin 35 g/L</section>
        <section title="ECG Assessment">Heart rate 65 bpm, sinus rhythm, narrow QRS complex (90 ms), PR interval 180 ms</section>
        <section title="Background">No background provided</section>
        <section title="Medications (Problem List)">No medications listed</section>
        <section title="Social History">Not available</section>
        <section title="Investigation Summary">Not available</section>
        <section title="Echocardiography">EF 55%, AVA 0.8 cm², mean gradient 40 mmHg</section>
        <section title="Enhanced CT Analysis">Annulus area 432 mm², LVOT area 340 mm², calcium score 3807</section>
        <section title="Procedure Planning">26mm Edwards valve, primary access via RFA, wire: Confida, goals: suitable for OT</section>
        <section title="Alerts & Anatomical Considerations">Moderate renal impairment - consider contrast limitation</section>
        <section title="Missing / Not Stated">Multiple clinical parameters</section>
        </report>
      `;

      mockProcessWithAgent.mockResolvedValue(xmlOutput);
      const agent = new TAVIWorkupAgent();
      const report = await agent.process(comprehensiveInput);

      // Verify comprehensive sections
      expect(report.content).toContain('Laboratory Values\n\nCreatinine 65');
      expect(report.content).toContain('ECG Assessment\n\nHeart rate 65');
      expect(report.content).toContain('Enhanced CT Analysis\n\nAnnulus area 432');
      expect(report.content).toContain('Procedure Planning\n\n26mm Edwards');

      // Verify structured data includes all new fields
      const [, payload] = mockProcessWithAgent.mock.calls[0];
      const parsed = JSON.parse(payload);

      expect(parsed.structured_data.laboratory.creatinine).toBe('65 μmol/L');
      expect(parsed.structured_data.ecg.heart_rate).toBe('65 bpm');
      expect(parsed.structured_data.ct_measurements.lvot_area).toBe('340 mm²');
      expect(parsed.structured_data.procedure_plan.valve_selection.type).toBe('Edwards');
    });
  });
});
