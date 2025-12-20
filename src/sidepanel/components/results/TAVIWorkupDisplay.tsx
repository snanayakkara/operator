/**
 * TAVI Workup Structured Display Component
 *
 * Displays TAVI workup data in a structured, interactive format:
 * - Shows each clinical section with proper formatting
 * - Displays missing information as interactive input fields
 * - Allows users to complete missing data and regenerate
 * - Provides formatted output for clinical documentation
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckIcon,
  AlertCircleIcon,
  FileTextIcon,
  ActivityIcon,
  HeartIcon,
  UserIcon
} from '../icons/OptimizedIcons';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import AnimatedCopyIcon from '../AnimatedCopyIcon';
import { Button } from '../buttons';
import { FieldValidationPrompt } from './FieldValidationPrompt';
import { useValidationCheckpoint } from '@/hooks/useValidationCheckpoint';
import type { ValidationResult } from '@/types/medical.types';
import type { TAVIWorkupStructuredSections } from '@/types/medical.types';
import { getValidationConfig } from '@/config/validationFieldConfig';

interface TAVIWorkupDisplayProps {
  structuredSections?: TAVIWorkupStructuredSections; // Made optional for backward compatibility
  results?: string; // Raw JSON fallback for existing sessions
  missingInfo?: string[];
  onCopy?: (text: string) => void;
  onInsertToEMR?: (text: string) => void;
  onReprocessWithAnswers?: (answers: Record<string, string>) => void;
  validationResult?: ValidationResult | null;
  validationStatus?: 'complete' | 'awaiting_validation';
  onReprocessWithValidation?: (fields: Record<string, unknown>) => void;
  className?: string;
}

interface SectionConfig {
  key: keyof TAVIWorkupStructuredSections;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  priority: 'high' | 'medium' | 'low';
  group: 'demographics' | 'clinical' | 'investigations' | 'planning';
}

interface GroupConfig {
  key: 'demographics' | 'clinical' | 'investigations' | 'planning';
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

const SECTION_CONFIGS: SectionConfig[] = [
  // Demographics Group
  { key: 'patient', title: 'Patient Demographics', icon: UserIcon, color: 'blue', priority: 'high', group: 'demographics' },
  { key: 'social_history', title: 'Social History', icon: UserIcon, color: 'cyan', priority: 'low', group: 'demographics' },

  // Clinical Assessment Group
  { key: 'clinical', title: 'Clinical Assessment', icon: ActivityIcon, color: 'green', priority: 'high', group: 'clinical' },
  { key: 'background', title: 'Background History', icon: FileTextIcon, color: 'gray', priority: 'medium', group: 'clinical' },
  { key: 'medications', title: 'Medications', icon: FileTextIcon, color: 'orange', priority: 'medium', group: 'clinical' },

  // Investigations Group
  { key: 'laboratory', title: 'Laboratory Values', icon: FileTextIcon, color: 'purple', priority: 'medium', group: 'investigations' },
  { key: 'ecg', title: 'ECG Assessment', icon: ActivityIcon, color: 'red', priority: 'medium', group: 'investigations' },
  { key: 'investigations', title: 'Investigation Summary', icon: FileTextIcon, color: 'indigo', priority: 'medium', group: 'investigations' },
  { key: 'echocardiography', title: 'Echocardiography', icon: HeartIcon, color: 'red', priority: 'high', group: 'investigations' },

  // Planning Group
  { key: 'procedure_planning', title: 'Procedure Planning', icon: FileTextIcon, color: 'violet', priority: 'high', group: 'planning' },
  { key: 'alerts', title: 'Alerts & Considerations', icon: AlertCircleIcon, color: 'red', priority: 'high', group: 'planning' }
];

const GROUP_CONFIGS: GroupConfig[] = [
  {
    key: 'demographics',
    title: 'Demographics',
    icon: UserIcon,
    color: 'blue',
    description: 'Patient demographics and social information'
  },
  {
    key: 'clinical',
    title: 'Clinical Assessment',
    icon: ActivityIcon,
    color: 'green',
    description: 'Clinical history, medications, and assessments'
  },
  {
    key: 'investigations',
    title: 'Investigations',
    icon: HeartIcon,
    color: 'purple',
    description: 'Imaging, laboratory, and diagnostic studies'
  },
  {
    key: 'planning',
    title: 'Planning',
    icon: FileTextIcon,
    color: 'violet',
    description: 'Procedure planning and clinical considerations'
  }
];

// Use centralized validation configuration
const { fieldConfig: TAVI_VALIDATION_FIELD_CONFIG, copy: TAVI_VALIDATION_COPY } = getValidationConfig('tavi');

export const TAVIWorkupDisplay: React.FC<TAVIWorkupDisplayProps> = ({
  structuredSections,
  results,
  missingInfo: _missingInfo = [], // Reserved for future enhancement
  onCopy,
  onInsertToEMR,
  onReprocessWithAnswers,
  validationResult,
  validationStatus,
  onReprocessWithValidation,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['patient', 'clinical', 'alerts']));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['demographics', 'clinical', 'investigations', 'planning']));
  const [showMissingInfoForm, setShowMissingInfoForm] = useState(false);
  const [missingInfoAnswers, setMissingInfoAnswers] = useState<Record<string, string>>({});
  const [buttonStates, setButtonStates] = useState({ copied: false, inserted: false });
  const {
    showValidationModal,
    validationResult: activeValidationResult,
    handleValidationRequired,
    handleValidationContinue,
    handleValidationCancel,
    handleValidationSkip,
    clearValidationState
  } = useValidationCheckpoint<ValidationResult>({ agentType: 'tavi-workup' });

  useEffect(() => {
    if (validationStatus === 'awaiting_validation' && validationResult) {
      handleValidationRequired(validationResult);
    } else if (validationStatus && validationStatus !== 'awaiting_validation') {
      clearValidationState();
    }
  }, [validationStatus, validationResult, handleValidationRequired, clearValidationState]);

  // Backward compatibility: Parse JSON from results if structured sections not available
  const effectiveStructuredSections = useMemo(() => {
    if (structuredSections) {
      return structuredSections;
    }

    const blankStructure = (defaults?: Partial<TAVIWorkupStructuredSections>): TAVIWorkupStructuredSections => ({
      patient: { content: 'No data available', missing: [] },
      clinical: { content: 'No data available', missing: [] },
      laboratory: { content: 'No data available', missing: [] },
      ecg: { content: 'No data available', missing: [] },
      background: { content: 'No data available', missing: [] },
      medications: { content: 'No data available', missing: [] },
      social_history: { content: 'No data available', missing: [] },
      investigations: { content: 'No data available', missing: [] },
      echocardiography: { content: 'No data available', missing: [] },
      procedure_planning: { content: 'No data available', missing: [] },
      alerts: { content: 'No alerts', missing: [] },
      missing_summary: {
        missing_clinical: [],
        missing_diagnostic: [],
        missing_measurements: [],
        completeness_score: '0% (No data available)'
      },
      ...defaults
    });

    const normalizeSectionContent = (
      content: string,
      key: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>
    ): string => {
      const trimmed = content.trim();
      if (!trimmed) return key === 'alerts' ? 'No alerts' : 'Not provided';
      const lower = trimmed.toLowerCase();
      const indicatesMissing =
        /\bnot available\b/.test(lower) ||
        /\bno data available\b/.test(lower) ||
        /\bnot provided\b/.test(lower) ||
        /\bno\b.*\bprovided\b/.test(lower);
      if (indicatesMissing) return key === 'alerts' ? 'No alerts' : 'Not provided';
      return trimmed;
    };

    const mapTitleToKey = (
      title: string
    ): keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'> | 'missing_summary' | null => {
      const normalized = title.trim().toLowerCase();
      if (normalized === 'patient' || normalized.includes('patient')) return 'patient';
      if (normalized === 'clinical' || normalized.includes('clinical')) return 'clinical';
      if (normalized === 'laboratory values' || normalized === 'bloods' || normalized.includes('laboratory')) return 'laboratory';
      if (normalized === 'ecg assessment' || normalized === 'ecg' || normalized.includes('ecg')) return 'ecg';
      if (normalized === 'background' || normalized.includes('background')) return 'background';
      if (normalized.startsWith('medications')) return 'medications';
      if (normalized === 'social history' || normalized.includes('social')) return 'social_history';
      if (normalized.includes('investigation')) return 'investigations';
      if (normalized === 'echocardiography' || normalized === 'echo' || normalized.includes('echo')) return 'echocardiography';
      if (normalized === 'procedure planning' || normalized.includes('procedure') || normalized.includes('devices planned')) return 'procedure_planning';
      if (normalized.includes('alerts')) return 'alerts';
      if (normalized.includes('missing')) return 'missing_summary';
      return null;
    };

    const exactHeadingMap = new Map<string, ReturnType<typeof mapTitleToKey>>([
      ['patient', 'patient'],
      ['patient demographics', 'patient'],
      ['clinical', 'clinical'],
      ['clinical assessment', 'clinical'],
      ['laboratory values', 'laboratory'],
      ['bloods', 'laboratory'],
      ['ecg assessment', 'ecg'],
      ['ecg', 'ecg'],
      ['background', 'background'],
      ['background history', 'background'],
      ['medications', 'medications'],
      ['medications (problem list)', 'medications'],
      ['social history', 'social_history'],
      ['investigation summary', 'investigations'],
      ['investigations', 'investigations'],
      ['other investigations', 'investigations'],
      ['echocardiography', 'echocardiography'],
      ['echo', 'echocardiography'],
      ['procedure planning', 'procedure_planning'],
      ['procedure plan', 'procedure_planning'],
      ['devices planned', 'procedure_planning'],
      ['alerts & anatomical considerations', 'alerts'],
      ['alerts & considerations', 'alerts'],
      ['alerts', 'alerts'],
      ['missing / not stated', 'missing_summary'],
      ['missing / not stated:', 'missing_summary']
    ]);

    const extractMissingList = (content: string): string[] => {
      const cleaned = content
        .replace(/\r\n/g, '\n')
        .replace(/[•·]/g, '\n')
        .replace(/;/g, '\n')
        .trim();
      if (!cleaned) return [];
      return cleaned
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);
    };

    // Try to parse JSON from results field
    if (results) {
      try {
        // Clean the response to extract JSON
        let jsonContent = results.trim();
        jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '');

        // Try to find JSON object in the response
        const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);

          // Convert to TAVIWorkupStructuredSections format
          const parsedSections: TAVIWorkupStructuredSections = {
            patient: {
              content: jsonData.patient?.content || 'Not provided',
              missing: jsonData.patient?.missing || []
            },
            clinical: {
              content: jsonData.clinical?.content || 'Not provided',
              missing: jsonData.clinical?.missing || []
            },
            laboratory: {
              content: jsonData.laboratory?.content || 'Not provided',
              missing: jsonData.laboratory?.missing || []
            },
            ecg: {
              content: jsonData.ecg?.content || 'Not provided',
              missing: jsonData.ecg?.missing || []
            },
            background: {
              content: jsonData.background?.content || 'Not provided',
              missing: jsonData.background?.missing || []
            },
            medications: {
              content: jsonData.medications?.content || 'Not provided',
              missing: jsonData.medications?.missing || []
            },
            social_history: {
              content: jsonData.social_history?.content || 'Not provided',
              missing: jsonData.social_history?.missing || []
            },
            investigations: {
              content: jsonData.investigations?.content || 'Not provided',
              missing: jsonData.investigations?.missing || []
            },
            echocardiography: {
              content: jsonData.echocardiography?.content || 'Not provided',
              missing: jsonData.echocardiography?.missing || []
            },
            procedure_planning: {
              content: jsonData.procedure_planning?.content || 'Not provided',
              missing: jsonData.procedure_planning?.missing || []
            },
            alerts: {
              content: jsonData.alerts?.content || 'No alerts',
              missing: jsonData.alerts?.missing || [],
              pre_anaesthetic_review_text: jsonData.alerts?.pre_anaesthetic_review_text,
              pre_anaesthetic_review_json: jsonData.alerts?.pre_anaesthetic_review_json
            },
            missing_summary: jsonData.missing_summary || {
              missing_clinical: [],
              missing_diagnostic: [],
              missing_measurements: [],
              completeness_score: '0% (No data)'
            }
          };

          return parsedSections;
        }
      } catch (error) {
        console.warn('Failed to parse TAVI JSON from results:', error);
      }

      // XML fallback: <section title="...">...</section>
      try {
        const xmlRegex = /<section\s+title="([^"]+)"\s*>([\s\S]*?)<\/section>/gi;
        const parsed = blankStructure({
          patient: { content: 'Not provided', missing: [] },
          clinical: { content: 'Not provided', missing: [] },
          laboratory: { content: 'Not provided', missing: [] },
          ecg: { content: 'Not provided', missing: [] },
          background: { content: 'Not provided', missing: [] },
          medications: { content: 'Not provided', missing: [] },
          social_history: { content: 'Not provided', missing: [] },
          investigations: { content: 'Not provided', missing: [] },
          echocardiography: { content: 'Not provided', missing: [] },
          procedure_planning: { content: 'Not provided', missing: [] },
          alerts: { content: 'No alerts', missing: [] },
          missing_summary: {
            missing_clinical: [],
            missing_diagnostic: [],
            missing_measurements: [],
            completeness_score: 'Not assessed'
          }
        });

        let match: RegExpExecArray | null;
        let matched = false;
        while ((match = xmlRegex.exec(results)) !== null) {
          matched = true;
          const title = match[1]?.trim() ?? '';
          const rawContent = match[2] ?? '';
          const content = rawContent.replace(/<\/?[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          const key = mapTitleToKey(title);
          if (!key) continue;
          if (key === 'missing_summary') {
            parsed.missing_summary.missing_measurements = extractMissingList(content);
            continue;
          }
          parsed[key] = { content: normalizeSectionContent(content, key), missing: [] } as any;
        }

        if (matched) {
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to parse TAVI XML from results:', error);
      }

      // Plain headings fallback: "Patient\n...\n\nClinical\n..."
      try {
        const normalized = results.replace(/\r\n/g, '\n').trim();
        const lines = normalized.split('\n');

        const headings: Array<{ lineIndex: number; key: ReturnType<typeof mapTitleToKey> }> = [];
        for (let i = 0; i < lines.length; i++) {
          const lineKey = lines[i].trim().toLowerCase();
          const maybe = exactHeadingMap.get(lineKey) ?? null;
          if (maybe) {
            headings.push({ lineIndex: i, key: maybe });
          }
        }

        if (headings.length > 0) {
          const parsed = blankStructure({
            patient: { content: 'Not provided', missing: [] },
            clinical: { content: 'Not provided', missing: [] },
            laboratory: { content: 'Not provided', missing: [] },
            ecg: { content: 'Not provided', missing: [] },
            background: { content: 'Not provided', missing: [] },
            medications: { content: 'Not provided', missing: [] },
            social_history: { content: 'Not provided', missing: [] },
            investigations: { content: 'Not provided', missing: [] },
            echocardiography: { content: 'Not provided', missing: [] },
            procedure_planning: { content: 'Not provided', missing: [] },
            alerts: { content: 'No alerts', missing: [] },
            missing_summary: {
              missing_clinical: [],
              missing_diagnostic: [],
              missing_measurements: [],
              completeness_score: 'Not assessed'
            }
          });

          for (let i = 0; i < headings.length; i++) {
            const start = headings[i].lineIndex + 1;
            const end = headings[i + 1]?.lineIndex ?? lines.length;
            const content = lines.slice(start, end).join('\n').trim();
            const key = headings[i].key;
            if (!key) continue;
            if (key === 'missing_summary') {
              parsed.missing_summary.missing_measurements = extractMissingList(content);
              continue;
            }
            parsed[key] = { content: normalizeSectionContent(content, key), missing: [] } as any;
          }

          return parsed;
        }
      } catch (error) {
        console.warn('Failed to parse TAVI plain sections from results:', error);
      }
    }

    // Ultimate fallback - empty structure
    return blankStructure();
  }, [structuredSections, results]);

  // Calculate completion status
  const completionStatus = useMemo(() => {
    const totalSections = SECTION_CONFIGS.length;
    const completedSections = SECTION_CONFIGS.filter(config => {
      const section = effectiveStructuredSections[config.key];
      if (config.key === 'missing_summary') return true; // Always considered complete
      return section && 'content' in section && section.content &&
        section.content !== 'Not provided' &&
        section.content !== 'No data available' &&
        !section.content.includes('not provided') &&
        !section.content.includes('not available');
    }).length;

    const completionPercentage = Math.round((completedSections / totalSections) * 100);
    const missingSummary = effectiveStructuredSections.missing_summary;
    const totalMissingItems = [
      ...(missingSummary?.missing_clinical || []),
      ...(missingSummary?.missing_diagnostic || []),
      ...(missingSummary?.missing_measurements || [])
    ].length;

    return {
      percentage: completionPercentage,
      completedSections,
      totalSections,
      totalMissingItems,
      status: completionPercentage >= 80 ? 'excellent' : completionPercentage >= 60 ? 'good' : completionPercentage >= 40 ? 'fair' : 'incomplete'
    };
  }, [effectiveStructuredSections]);

  // Generate formatted clinical report
  const formattedReport = useMemo(() => {
    const reportSections = SECTION_CONFIGS
      .filter(config => config.key !== 'missing_summary')
      .map(config => {
        const section = effectiveStructuredSections[config.key];
        if (!section || !('content' in section) || !section.content ||
            section.content === 'Not provided' || section.content === 'No data available' ||
            section.content.includes('not provided') || section.content.includes('not available')) {
          return null;
        }

        let sectionText = `**${config.title}**\n${section.content}`;

        // Add pre-anaesthetic review if this is the alerts section and it has the data
        if (config.key === 'alerts' && 'pre_anaesthetic_review_text' in section && section.pre_anaesthetic_review_text) {
          sectionText += `\n\n${'pre_anaesthetic_review_text' in section ? section.pre_anaesthetic_review_text : ''}`
        }

        return sectionText + '\n';
      })
      .filter(Boolean)
      .join('\n');

    const header = `TAVI WORKUP SUMMARY\nCompletion: ${completionStatus.percentage}% (${completionStatus.status})\n\n`;
    return header + reportSections;
  }, [effectiveStructuredSections, completionStatus]);

  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  }, []);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  // Group sections by category for display
  const groupedSections = useMemo(() => {
    return GROUP_CONFIGS.map(group => {
      const sectionsInGroup = SECTION_CONFIGS.filter(config => config.group === group.key);
      const completedSections = sectionsInGroup.filter(config => {
        const section = effectiveStructuredSections[config.key];
        if (config.key === 'missing_summary') return true;
        return section && 'content' in section && section.content &&
          section.content !== 'Not provided' &&
          section.content !== 'No data available' &&
          !section.content.includes('not provided') &&
          !section.content.includes('not available');
      }).length;

      const totalMissingItems = sectionsInGroup.reduce((acc, config) => {
        const section = effectiveStructuredSections[config.key];
        if (section && 'missing' in section && section.missing) {
          return acc + section.missing.length;
        }
        return acc;
      }, 0);

      return {
        ...group,
        sections: sectionsInGroup,
        completed: completedSections,
        total: sectionsInGroup.length,
        completionPercentage: Math.round((completedSections / sectionsInGroup.length) * 100),
        missingItems: totalMissingItems
      };
    });
  }, [effectiveStructuredSections]);

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      await onCopy(formattedReport);
      setButtonStates(prev => ({ ...prev, copied: true }));
      setTimeout(() => setButtonStates(prev => ({ ...prev, copied: false })), 2000);
    }
  }, [onCopy, formattedReport]);

  const handleInsert = useCallback(async () => {
    if (onInsertToEMR) {
      await onInsertToEMR(formattedReport);
      setButtonStates(prev => ({ ...prev, inserted: true }));
      setTimeout(() => setButtonStates(prev => ({ ...prev, inserted: false })), 2000);
    }
  }, [onInsertToEMR, formattedReport]);

  const handleMissingInfoSubmit = useCallback(() => {
    if (onReprocessWithAnswers && Object.keys(missingInfoAnswers).length > 0) {
      onReprocessWithAnswers(missingInfoAnswers);
      setShowMissingInfoForm(false);
      setMissingInfoAnswers({});
    }
  }, [onReprocessWithAnswers, missingInfoAnswers]);

  const renderSection = (config: SectionConfig) => {
    const section = effectiveStructuredSections[config.key];
    const isExpanded = expandedSections.has(config.key);

    // Type guard for TAVIWorkupSection vs TAVIWorkupMissingSummary
    const isMissingSummary = config.key === 'missing_summary';

    const hasContent = !isMissingSummary && section && 'content' in section &&
      section.content !== 'Not provided' &&
      section.content !== 'No data available' &&
      !section.content.includes('not provided') &&
      !section.content.includes('not available') &&
      section.content.trim().length > 0;
    const hasMissingInfo = !isMissingSummary && section && 'missing' in section && section.missing && section.missing.length > 0;

    const IconComponent = config.icon;

    return (
      <motion.div
        key={config.key}
        className="border border-gray-200 rounded-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Section Header */}
        <Button
          onClick={() => toggleSection(config.key)}
          variant="ghost"
          className={`w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-none ${
            hasContent ? 'border-l-4 border-l-green-500' : hasMissingInfo ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-gray-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            <IconComponent className={`w-5 h-5 text-${config.color}-600`} />
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">{config.title}</h3>
              <p className="text-sm text-gray-600">
                {hasContent ? 'Complete' : hasMissingInfo && 'missing' in section ? `${section.missing.length} missing items` : 'No data'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasContent && <CheckIcon className="w-4 h-4 text-green-600" />}
            {hasMissingInfo && <AlertCircleIcon className="w-4 h-4 text-yellow-600" />}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </Button>

        {/* Section Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t border-gray-200">
                {hasContent ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="text-gray-900 whitespace-pre-wrap">{'content' in section ? section.content : ''}</div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No data available</div>
                )}

                {/* Pre Anaesthetic Review - Only for alerts section */}
                {config.key === 'alerts' && 'pre_anaesthetic_review_text' in section && section.pre_anaesthetic_review_text && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3">Pre Anaesthetic Review</h4>
                    <div className="text-sm text-blue-900 whitespace-pre-wrap">
                      {'pre_anaesthetic_review_text' in section ? section.pre_anaesthetic_review_text : ''}
                    </div>
                    {'pre_anaesthetic_review_json' in section && section.pre_anaesthetic_review_json && (
                      <details className="mt-3">
                        <summary className="text-xs text-blue-700 cursor-pointer hover:text-blue-900">
                          View structured anaesthetic data
                        </summary>
                        <pre className="mt-2 text-xs text-blue-800 bg-blue-100 p-2 rounded overflow-x-auto">
                          {'pre_anaesthetic_review_json' in section ? JSON.stringify(section.pre_anaesthetic_review_json, null, 2) : ''}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {/* Missing Information */}
                {hasMissingInfo && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-2">Missing Information:</h4>
                    <ul className="text-sm text-yellow-700 space-y-2">
                      {'missing' in section ? section.missing.map((item: string, index: number) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-white border border-yellow-200 rounded">
                          <div className="flex items-start space-x-2 flex-1">
                            <span className="text-yellow-500 mt-0.5">•</span>
                            <span className="flex-1">{item}</span>
                          </div>
                          <Button
                            onClick={() => {
                              const input = prompt(`Please provide: ${item}`, '');
                              if (input && input.trim()) {
                                // Here we would handle adding the missing information
                                console.log(`Adding missing info for ${config.key}:`, { field: item, value: input.trim() });
                                // TODO: Implement missing data handler
                              }
                            }}
                            variant="primary"
                            size="sm"
                            className="ml-2 text-xs"
                          >
                            Add
                          </Button>
                        </li>
                      )) : null}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-yellow-200">
                      <Button
                        onClick={() => {
                          console.log('Regenerating TAVI report with missing information...');
                          // TODO: Implement regeneration with missing info
                        }}
                        variant="primary"
                        size="md"
                        fullWidth
                        className="text-sm"
                      >
                        Regenerate with Missing Information
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Completion Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">TAVI Workup Summary</h2>
            <p className="text-sm text-gray-600">
              {completionStatus.completedSections} of {completionStatus.totalSections} sections complete
              {completionStatus.totalMissingItems > 0 && ` • ${completionStatus.totalMissingItems} items missing`}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              completionStatus.status === 'excellent' ? 'text-green-600' :
              completionStatus.status === 'good' ? 'text-blue-600' :
              completionStatus.status === 'fair' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {completionStatus.percentage}%
            </div>
            <div className={`text-xs uppercase tracking-wide ${
              completionStatus.status === 'excellent' ? 'text-green-600' :
              completionStatus.status === 'good' ? 'text-blue-600' :
              completionStatus.status === 'fair' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {completionStatus.status}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                completionStatus.status === 'excellent' ? 'bg-green-500' :
                completionStatus.status === 'good' ? 'bg-blue-500' :
                completionStatus.status === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${completionStatus.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Copy Button */}
        <Button
          onClick={handleCopy}
          variant={buttonStates.copied ? 'success' : 'outline'}
          size="md"
          startIcon={buttonStates.copied ? <CheckIcon className="w-4 h-4" /> : <AnimatedCopyIcon className="w-4 h-4" />}
        >
          {buttonStates.copied ? 'Copied!' : 'Copy Report'}
        </Button>

        {/* Insert Button */}
        <Button
          onClick={handleInsert}
          variant={buttonStates.inserted ? 'secondary' : 'outline'}
          size="md"
          startIcon={buttonStates.inserted ? <CheckIcon className="w-4 h-4" /> : <FileTextIcon className="w-4 h-4" />}
        >
          {buttonStates.inserted ? 'Inserted!' : 'Insert to EMR'}
        </Button>

        {/* Complete Missing Info Button */}
        {completionStatus.totalMissingItems > 0 && (
          <Button
            onClick={() => setShowMissingInfoForm(!showMissingInfoForm)}
            variant="outline"
            size="md"
            startIcon={<Plus className="w-4 h-4" />}
            className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
          >
            Complete Missing Info
          </Button>
        )}
      </div>

      {/* Missing Information Form */}
      <AnimatePresence>
        {showMissingInfoForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-3">Complete Missing Information</h3>
              <div className="space-y-3">
                {/* Collect all missing items */}
                {[
                  ...effectiveStructuredSections.missing_summary.missing_clinical,
                  ...effectiveStructuredSections.missing_summary.missing_diagnostic,
                  ...effectiveStructuredSections.missing_summary.missing_measurements
                ].map((item, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {item}
                    </label>
                    <input
                      type="text"
                      value={missingInfoAnswers[item] || ''}
                      onChange={(e) => setMissingInfoAnswers(prev => ({
                        ...prev,
                        [item]: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter ${item.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  onClick={() => setShowMissingInfoForm(false)}
                  variant="ghost"
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMissingInfoSubmit}
                  disabled={Object.keys(missingInfoAnswers).length === 0}
                  variant="primary"
                  size="md"
                >
                  Reprocess with Answers
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped Structured Sections */}
      <div className="space-y-6">
        {groupedSections.map(group => (
          <div key={group.key} className="space-y-3">
            {/* Group Header */}
            <Button
              onClick={() => toggleGroup(group.key)}
              variant="ghost"
              className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200 rounded-lg transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg bg-${group.color}-100`}>
                  <group.icon className={`w-5 h-5 text-${group.color}-600`} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">{group.title}</h3>
                  <p className="text-sm text-gray-600">{group.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Group Progress */}
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    group.completionPercentage >= 80 ? 'text-green-600' :
                    group.completionPercentage >= 50 ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {group.completed}/{group.total} complete
                  </div>
                  <div className="text-xs text-gray-500">
                    {group.completionPercentage}%
                    {group.missingItems > 0 && ` • ${group.missingItems} missing`}
                  </div>
                </div>
                {/* Progress Circle */}
                <div className={`w-12 h-12 rounded-full border-4 ${
                  group.completionPercentage >= 80 ? 'border-green-500' :
                  group.completionPercentage >= 50 ? 'border-blue-500' : 'border-yellow-500'
                } border-r-transparent animate-pulse flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${
                    group.completionPercentage >= 80 ? 'text-green-600' :
                    group.completionPercentage >= 50 ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {group.completionPercentage}%
                  </span>
                </div>
                {/* Expand/Collapse Icon */}
                {expandedGroups.has(group.key) ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </Button>

            {/* Group Sections */}
            <AnimatePresence>
              {expandedGroups.has(group.key) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden space-y-3 pl-6"
                >
                  {group.sections.map(renderSection)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Summary Information */}
      {effectiveStructuredSections.missing_summary.completeness_score && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Assessment Summary</h3>
          <p className="text-sm text-gray-700">
            <strong>Completeness Score:</strong> {effectiveStructuredSections.missing_summary.completeness_score}
          </p>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && activeValidationResult && (
        <FieldValidationPrompt
          agentLabel="TAVI Workup"
          validation={activeValidationResult}
          fieldConfig={TAVI_VALIDATION_FIELD_CONFIG}
          copy={TAVI_VALIDATION_COPY}
          onCancel={() => {
            console.log('🚫 TAVI Display: Validation cancelled');
            handleValidationCancel();
          }}
          onSkip={() => {
            console.log('⏭️ TAVI Display: Validation skipped');
            handleValidationSkip();
            // TODO: Force generation with incomplete data
          }}
          onContinue={(userFields) => {
            console.log('✅ TAVI Display: Validation complete, user fields:', userFields);
            handleValidationContinue(userFields);
            if (onReprocessWithValidation) {
              onReprocessWithValidation(userFields);
            }
          }}
        />
      )}
    </div>
  );
};
