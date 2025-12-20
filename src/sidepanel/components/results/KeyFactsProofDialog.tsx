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
import { Volume2, Eye, Loader2 } from 'lucide-react';
import { KeyFact, ProofModeConfig, KeyFactsProofResult } from '../../../types/medical.types';
import { ttsService } from '../../../services/TTSService';
import VisualProofMode from './VisualProofMode';
import AudioProofMode from './AudioProofMode';

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
  initialConfig
}) => {
  const [config, setConfig] = useState<ProofModeConfig>({
    mode: initialConfig?.mode || 'visual',
    ttsSpeed: initialConfig?.ttsSpeed || 0.9,
    autoAdvance: initialConfig?.autoAdvance || false,
    groupByCategory: initialConfig?.groupByCategory !== false, // Default true
    showConfidence: initialConfig?.showConfidence || false
  });

  const [ttsAvailable, setTtsAvailable] = useState(true);
  const [checkingTTS, setCheckingTTS] = useState(true);

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

  const handleModeChange = (mode: 'audio' | 'visual') => {
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
            Visual Mode
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
            Audio Mode
            {!ttsAvailable && !checkingTTS && (
              <span className="text-xs">(Unavailable)</span>
            )}
          </button>
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
          ) : (
            <AudioProofMode
              facts={facts}
              agentLabel={agentLabel}
              onConfirm={handleComplete}
              onCancel={handleCancel}
              ttsSpeed={config.ttsSpeed}
              autoAdvance={config.autoAdvance}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default KeyFactsProofDialog;
