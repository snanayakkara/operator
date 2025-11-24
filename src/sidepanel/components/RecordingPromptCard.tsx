import React, { useState, useCallback } from 'react';
import { X as _X, Clock as _Clock, Lightbulb, BookOpen, ChevronDown, ChevronRight, Mic as _Mic } from 'lucide-react';
import { getRecordingPrompt, type RecordingPromptSection } from '@/config/recordingPrompts';
import type { AgentType } from '@/types/medical.types';
import Button from './buttons/Button';

interface RecordingPromptCardProps {
  agentType: AgentType;
  isVisible: boolean;
  onClose?: () => void;
  onStartRecording?: () => void;
  compactMode?: boolean; // New prop for vertical layout during recording
}

interface ExpandableSection {
  [key: string]: boolean;
}

export const RecordingPromptCard: React.FC<RecordingPromptCardProps> = React.memo(({
  agentType,
  isVisible,
  onClose,
  onStartRecording,
  compactMode = false
}) => {
  const [expandedSections, setExpandedSections] = useState<ExpandableSection>({});
  const promptConfig = getRecordingPrompt(agentType);

  // Reduced logging frequency to prevent console spam
  if (Math.random() < 0.001) { // Log only 0.1% of renders
    console.log('📋 Recording prompt shown for:', agentType);
  }

  const toggleSection = useCallback((sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  }, []);

  const _handleStartRecording = useCallback(() => {
    onStartRecording?.();
    onClose?.();
  }, [onStartRecording, onClose]);

  if (!isVisible || !promptConfig) {
    return null;
  }

  const renderSection = (section: RecordingPromptSection, index: number) => {
    const isExpanded = expandedSections[section.title] ?? (compactMode ? false : index === 0); // In compact mode, sections collapsed by default
    
    return (
      <div key={section.title} className={`border border-gray-200 rounded-xl overflow-hidden ${compactMode ? 'mb-2' : 'mb-3'}`}>
        <Button
          onClick={() => toggleSection(section.title)}
          variant="ghost"
          size={compactMode ? 'sm' : 'md'}
          className={`!w-full !justify-between bg-gray-50 hover:bg-gray-100 rounded-none ${
            compactMode ? 'px-3 py-2' : 'px-4 py-3'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className={compactMode ? 'text-sm' : 'text-lg'}>{section.icon}</span>
            <span className={`font-semibold text-gray-800 ${compactMode ? 'text-xs' : 'text-sm'}`}>{section.title}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className={`text-gray-500 ${compactMode ? 'w-3 h-3' : 'w-4 h-4'}`} />
          ) : (
            <ChevronRight className={`text-gray-500 ${compactMode ? 'w-3 h-3' : 'w-4 h-4'}`} />
          )}
        </Button>
        
        {isExpanded && (
          <div className={`bg-white ${compactMode ? 'px-3 py-2' : 'px-4 py-3'}`}>
            <ul className={compactMode ? 'space-y-1' : 'space-y-2'}>
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className={`flex items-start space-x-2 text-gray-700 ${compactMode ? 'text-xs' : 'text-sm'}`}>
                  <div className={`bg-blue-500 rounded-full mt-2 flex-shrink-0 ${compactMode ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full bg-white border border-gray-200 ${compactMode ? 'rounded-lg shadow-sm' : 'max-w-none mx-2 rounded-lg shadow-sm mb-4'}`}>
      <div className={`bg-white w-full overflow-hidden ${compactMode ? 'rounded-lg max-h-[40vh]' : 'rounded-lg max-h-[70vh]'}`}>
        {/* Header - flat rose color */}
        <div className={`bg-rose-500 text-white ${compactMode ? 'px-3 py-2' : 'px-3 py-2.5'}`}>
          <div className="flex items-center space-x-2">
            {!compactMode && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium uppercase tracking-wide">Recording</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <BookOpen className={compactMode ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
              <span className={`font-medium ${compactMode ? 'text-xs' : 'text-sm'}`}>
                {compactMode ? promptConfig.title.replace(' Recording', '') : promptConfig.title.replace(' Recording', '')}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`overflow-y-auto ${compactMode ? 'p-3 max-h-[35vh]' : 'p-4 max-h-[60vh]'}`}>
          {/* Introduction - Hide in compact mode */}
          {!compactMode && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start space-x-3">
                <Lightbulb className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700 text-sm font-medium">
                    Include these key elements while recording to ensure a comprehensive medical report:
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sections */}
          <div className={compactMode ? 'mb-3' : 'mb-6'}>
            {!compactMode && (
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>What to Include</span>
              </h3>
            )}
            {promptConfig.sections.map(renderSection)}
          </div>

          {/* Tips */}
          {promptConfig.tips.length > 0 && (
            <div className={compactMode ? 'mb-3' : 'mb-6'}>
              <h3 className={`font-semibold text-gray-800 ${compactMode ? 'mb-2 text-sm' : 'mb-3'}`}>💡 {compactMode ? 'Tips' : 'Recording Tips'}</h3>
              <div className={`bg-yellow-50 border border-yellow-200 rounded-lg ${compactMode ? 'p-2' : 'p-4'}`}>
                <ul className={compactMode ? 'space-y-1' : 'space-y-2'}>
                  {promptConfig.tips.map((tip, index) => (
                    <li key={index} className={`flex items-start space-x-2 text-yellow-800 ${compactMode ? 'text-xs' : 'text-sm'}`}>
                      <div className={`bg-yellow-500 rounded-full mt-2 flex-shrink-0 ${compactMode ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Terminology */}
          {promptConfig.terminology.length > 0 && (
            <div className={compactMode ? 'mb-2' : 'mb-6'}>
              <h3 className={`font-semibold text-gray-800 ${compactMode ? 'mb-2 text-sm' : 'mb-3'}`}>📚 {compactMode ? 'Terms' : 'Key Terminology'}</h3>
              <div className={`bg-green-50 border border-green-200 rounded-lg ${compactMode ? 'p-2' : 'p-4'}`}>
                <div className={`grid gap-2 ${compactMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {promptConfig.terminology.map((term, index) => (
                    <div key={index} className={`flex items-center space-x-2 text-green-800 ${compactMode ? 'text-xs' : 'text-sm'}`}>
                      <div className={`bg-green-500 rounded-full flex-shrink-0 ${compactMode ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
                      <span className="font-medium">{term}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});