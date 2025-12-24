/**
 * KeyFactsProofDialog.tsx
 *
 * Wrapper component for Key Facts Proof Mode.
 * Provides mode switcher (Audio/Visual) and manages the proof workflow.
 *
 * Phase 1: Audio + Visual modes only (Conversational mode deferred to Phase 2)
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../modals';
import { Volume2, Eye, Loader2, GitBranch } from 'lucide-react';
import { KeyFact, ProofModeConfig, KeyFactsProofResult, LesionTree } from '../../../types/medical.types';
import { ttsService } from '../../../services/TTSService';
import VisualProofMode from './VisualProofMode';
import AudioProofMode from './AudioProofMode';
import { LesionProofMode } from './LesionProofMode';

export interface KeyFactsProofDialogProps {
  /** Facts to verify */
  facts: KeyFact[];

  /** Agent name for context */
  agentLabel: string;

  /** Called when proof mode completes */
  onComplete: (result: KeyFactsProofResult) => void;

  /** Called when user cancels */
  onCancel: () => void;

  /** Is the dialog open? */
  isOpen: boolean;

  /** Optional initial configuration */
  initialConfig?: Partial<ProofModeConfig>;

  /** Optional lesion tree for AngioPCI proof mode */
  lesionTree?: LesionTree;

  /** Method used for lesion extraction */
  lesionExtractionMethod?: 'regex' | 'quick-model';
}

/**
 * KeyFactsProofDialog - Modal wrapper for key facts verification
 * Allows user to switch between Audio and Visual modes
 */
export const KeyFactsProofDialog: React.FC<KeyFactsProofDialogProps> = ({
  facts,
  agentLabel,
  onComplete,
  onCancel,
  isOpen,
  initialConfig,
  lesionTree,
  lesionExtractionMethod
}) => {
  // Determine initial mode: default to lesions if lesion tree provided, otherwise visual
  const getInitialMode = (): 'audio' | 'visual' | 'lesions' => {
    if (initialConfig?.mode) return initialConfig.mode;
    if (lesionTree) return 'lesions';
    return 'visual';
  };

  const [config, setConfig] = useState<ProofModeConfig>({
    mode: getInitialMode(),
    ttsSpeed: initialConfig?.ttsSpeed || 0.9,
    autoAdvance: initialConfig?.autoAdvance || false,
    groupByCategory: initialConfig?.groupByCategory !== false, // Default true
    showConfidence: initialConfig?.showConfidence || false
  });

  const [ttsAvailable, setTtsAvailable] = useState(true);
  const [checkingTTS, setCheckingTTS] = useState(true);

  useEffect(() => {
    if (!initialConfig) return;

    setConfig(prev => ({
      ...prev,
      ...(initialConfig.mode !== undefined ? { mode: initialConfig.mode } : {}),
      ...(initialConfig.ttsSpeed !== undefined ? { ttsSpeed: initialConfig.ttsSpeed } : {}),
      ...(initialConfig.autoAdvance !== undefined ? { autoAdvance: initialConfig.autoAdvance } : {}),
      ...(initialConfig.groupByCategory !== undefined ? { groupByCategory: initialConfig.groupByCategory } : {}),
      ...(initialConfig.showConfidence !== undefined ? { showConfidence: initialConfig.showConfidence } : {})
    }));
  }, [
    initialConfig?.mode,
    initialConfig?.ttsSpeed,
    initialConfig?.autoAdvance,
    initialConfig?.groupByCategory,
    initialConfig?.showConfidence
  ]);

  // Check TTS availability on mount
  useEffect(() => {
    const checkTTS = async () => {
      setCheckingTTS(true);
      const status = await ttsService.checkTTSAvailability();
      setTtsAvailable(status.ttsEnabled);
      setCheckingTTS(false);

      // If TTS not available and audio mode selected, switch to visual
      if (!status.ttsEnabled && config.mode === 'audio') {
        console.warn('[KeyFactsProofDialog] TTS unavailable, switching to visual mode');
        setConfig(prev => ({ ...prev, mode: 'visual' }));
      }
    };

    if (isOpen) {
      checkTTS();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModeChange = (mode: 'audio' | 'visual' | 'lesions') => {
    // Don't allow switching to audio if TTS unavailable
    if (mode === 'audio' && !ttsAvailable) {
      console.warn('[KeyFactsProofDialog] Cannot switch to audio mode: TTS unavailable');
      return;
    }
    setConfig(prev => ({ ...prev, mode }));
  };

  const handleComplete = (result: KeyFactsProofResult) => {
    onComplete(result);
  };

  const handleCancel = () => {
    // Stop any playing audio
    if (config.mode === 'audio') {
      ttsService.stop();
    }
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Verify Key Facts — ${agentLabel}`}
      size="lg"
    >
      <div className="key-facts-proof-dialog">
        {/* Audio callout (make audio review more visible) */}
        {!checkingTTS && ttsAvailable && config.mode !== 'audio' && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900 dark:border-blue-600/50 dark:bg-blue-950/40 dark:text-blue-100">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                <p className="text-sm font-semibold">Review with audio</p>
              </div>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                Listen to each fact and confirm or edit while it plays.
              </p>
            </div>
            <button
              onClick={() => handleModeChange('audio')}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              Enable Audio
            </button>
          </div>
        )}

        {/* Mode switcher */}
        <div className="mode-switcher flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => handleModeChange('visual')}
            disabled={checkingTTS}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              config.mode === 'visual'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            Visual
          </button>
          <button
            onClick={() => handleModeChange('audio')}
            disabled={checkingTTS || !ttsAvailable}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              config.mode === 'audio'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            } ${
              !ttsAvailable && !checkingTTS
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {checkingTTS ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            Audio
            {!ttsAvailable && !checkingTTS && (
              <span className="text-xs">(Unavailable)</span>
            )}
          </button>
          {lesionTree && (
            <button
              onClick={() => handleModeChange('lesions')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                config.mode === 'lesions'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Lesions
            </button>
          )}
        </div>

        {/* TTS unavailable warning */}
        {!checkingTTS && !ttsAvailable && (
          <div className="tts-warning mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Audio mode is unavailable (TTS server not running). Using visual mode.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Start whisper-server.py with mlx-audio to enable audio mode.
            </p>
          </div>
        )}

        {/* Mode-specific content */}
        <div className="proof-mode-content">
          {config.mode === 'visual' ? (
            <VisualProofMode
              facts={facts}
              agentLabel={agentLabel}
              onConfirm={handleComplete}
              onCancel={handleCancel}
              groupByCategory={config.groupByCategory}
              showConfidence={config.showConfidence}
            />
          ) : config.mode === 'audio' ? (
            <AudioProofMode
              facts={facts}
              agentLabel={agentLabel}
              onConfirm={handleComplete}
              onCancel={handleCancel}
              ttsSpeed={config.ttsSpeed}
              autoAdvance={config.autoAdvance}
            />
          ) : config.mode === 'lesions' && lesionTree ? (
            <LesionProofMode
              initialLesionTree={lesionTree}
              extractionMethod={lesionExtractionMethod || 'regex'}
              agentLabel={agentLabel}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

export default KeyFactsProofDialog;
