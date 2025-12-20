/**
 * AudioProofMode.tsx
 *
 * Audio proof mode component for Key Facts verification.
 * Reads facts aloud using TTS, allowing user to confirm/edit/flag
 * facts with keyboard while listening.
 *
 * Phase 1: Keyboard corrections only (voice corrections deferred to Phase 2)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Volume2, Pause, Play, Check, Edit3, X, AlertCircle, SkipForward } from 'lucide-react';
import { KeyFact, KeyFactsProofResult } from '../../../types/medical.types';
import { ttsService } from '../../../services/TTSService';
import { Button } from '../buttons';

export interface AudioProofModeProps {
  /** Facts to verify */
  facts: KeyFact[];

  /** Agent name for context */
  agentLabel: string;

  /** Called when user confirms all facts */
  onConfirm: (result: KeyFactsProofResult) => void;

  /** Called when user cancels */
  onCancel: () => void;

  /** TTS speed (0.5 - 2.0) */
  ttsSpeed?: number;

  /** Auto-advance to next fact after speaking? */
  autoAdvance?: boolean;
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

/**
 * AudioProofMode - Audio-based verification of key facts with TTS
 */
export const AudioProofMode: React.FC<AudioProofModeProps> = ({
  facts: initialFacts,
  agentLabel,
  onConfirm,
  onCancel,
  ttsSpeed = 0.9, // Slightly slower for medical clarity
  autoAdvance = false
}) => {
  const [facts, setFacts] = useState<KeyFact[]>(initialFacts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [startTime] = useState(Date.now());
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);

  const currentFact = facts[currentIndex];
  const isLastFact = currentIndex === facts.length - 1;

  // Check TTS availability on mount
  useEffect(() => {
    ttsService.checkTTSAvailability().then(status => {
      setTtsAvailable(status.ttsEnabled);
      if (!status.ttsEnabled) {
        console.warn('[AudioProofMode] TTS not available, audio mode degraded');
      }
    });

    return () => {
      // Cleanup on unmount
      ttsService.stop();
    };
  }, []);

  // Pre-generate TTS for all facts on mount
  useEffect(() => {
    if (!ttsAvailable) return;

    const generateAllTTS = async () => {
      const queue: Blob[] = [];
      for (const fact of facts) {
        try {
          const text = `${fact.label}: ${fact.value}${fact.unit ? ` ${fact.unit}` : ''}`;
          const audioBlob = await ttsService.synthesize({ text, speed: ttsSpeed });
          queue.push(audioBlob);
        } catch (error) {
          console.error(`[AudioProofMode] Failed to generate TTS for fact ${fact.id}:`, error);
          // Push empty blob as placeholder
          queue.push(new Blob());
        }
      }
      audioQueueRef.current = queue;
      console.log(`[AudioProofMode] Pre-generated TTS for ${queue.length} facts`);
    };

    generateAllTTS();
  }, [facts, ttsSpeed, ttsAvailable]);

  // Stats
  const stats = useMemo(() => {
    return {
      editsCount: facts.filter(f => f.status === 'edited').length,
      rejectsCount: facts.filter(f => f.status === 'rejected').length,
      confirmedCount: facts.filter(f => f.status === 'confirmed').length,
      pendingCount: facts.filter(f => f.status === 'pending').length
    };
  }, [facts]);

  const allFactsReviewed = useMemo(
    () => facts.every(f => f.status !== 'pending'),
    [facts]
  );

  const playCurrentFact = async () => {
    if (!ttsAvailable || currentIndex >= audioQueueRef.current.length) {
      console.warn('[AudioProofMode] Cannot play: TTS unavailable or no audio blob');
      return;
    }

    const audioBlob = audioQueueRef.current[currentIndex];
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[AudioProofMode] Empty audio blob, skipping');
      return;
    }

    try {
      setPlaybackState('playing');
      isPlayingRef.current = true;

      await ttsService.play(audioBlob, () => {
        // Playback ended
        isPlayingRef.current = false;
        setPlaybackState('idle');

        // Auto-advance if enabled
        if (autoAdvance && currentIndex < facts.length - 1) {
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
          }, 500); // Brief pause between facts
        }
      });
    } catch (error) {
      console.error('[AudioProofMode] Playback error:', error);
      setPlaybackState('idle');
      isPlayingRef.current = false;
    }
  };

  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      ttsService.stop();
      setPlaybackState('paused');
      isPlayingRef.current = false;
    } else {
      playCurrentFact();
    }
  };

  const handleNext = () => {
    if (currentIndex < facts.length - 1) {
      ttsService.stop();
      setPlaybackState('idle');
      isPlayingRef.current = false;
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      ttsService.stop();
      setPlaybackState('idle');
      isPlayingRef.current = false;
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleConfirmFact = () => {
    setFacts(prev => prev.map(f =>
      f.id === currentFact.id ? { ...f, status: 'confirmed' as const } : f
    ));
    if (!isLastFact) {
      handleNext();
    }
  };

  const handleStartEdit = () => {
    setEditingFactId(currentFact.id);
    setEditValue(currentFact.value);
    ttsService.stop();
    setPlaybackState('idle');
  };

  const handleSaveEdit = () => {
    setFacts(prev => prev.map(f =>
      f.id === currentFact.id
        ? {
            ...f,
            originalValue: f.originalValue || f.value,
            value: editValue,
            status: 'edited' as const
          }
        : f
    ));
    setEditingFactId(null);
    setEditValue('');
    if (!isLastFact) {
      handleNext();
    }
  };

  const handleCancelEdit = () => {
    setEditingFactId(null);
    setEditValue('');
  };

  const handleRejectFact = () => {
    setFacts(prev => prev.map(f =>
      f.id === currentFact.id ? { ...f, status: 'rejected' as const } : f
    ));
    if (!isLastFact) {
      handleNext();
    }
  };

  const handleConfirmAll = () => {
    const timeSpent = Date.now() - startTime;
    const result: KeyFactsProofResult = {
      facts,
      action: 'confirmed',
      modeUsed: 'audio',
      timeSpent,
      completedAt: Date.now(),
      editsCount: stats.editsCount,
      rejectsCount: stats.rejectsCount
    };
    onConfirm(result);
  };

  const handleCancelAll = () => {
    ttsService.stop();
    onCancel();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't intercept if editing
      if (editingFactId) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'c':
          e.preventDefault();
          handleConfirmFact();
          break;
        case 'e':
          e.preventDefault();
          handleStartEdit();
          break;
        case 'f':
          e.preventDefault();
          handleRejectFact();
          break;
        case 'arrowright':
        case 'n':
          e.preventDefault();
          handleNext();
          break;
        case 'arrowleft':
        case 'p':
          e.preventDefault();
          handlePrevious();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, playbackState, editingFactId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentFact) {
    return <div className="text-center text-gray-500">No facts to verify</div>;
  }

  return (
    <div className="audio-proof-mode">
      {/* Header */}
      <div className="proof-mode-header mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          <Volume2 className="w-5 h-5 inline mr-2" />
          Audio Verification — {agentLabel}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Listen to each fact and confirm, edit, or flag. Use keyboard shortcuts for quick navigation.
        </p>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Fact {currentIndex + 1} of {facts.length}</span>
          <span>{stats.confirmedCount + stats.editsCount} reviewed</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / facts.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current fact card */}
      <div className="fact-card border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {currentFact.category}
              </span>
              {currentFact.critical && (
                <span className="text-xs px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded font-medium">
                  CRITICAL
                </span>
              )}
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {currentFact.label}
            </h4>
          </div>

          {/* Status indicator */}
          {currentFact.status !== 'pending' && (
            <div className="status-badge">
              {currentFact.status === 'confirmed' && (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Confirmed</span>
                </div>
              )}
              {currentFact.status === 'edited' && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-5 h-5" />
                  <span className="text-sm font-medium">Edited</span>
                </div>
              )}
              {currentFact.status === 'rejected' && (
                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Flagged</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Value display or edit */}
        {editingFactId === currentFact.id ? (
          <div className="edit-controls space-y-3">
            <input
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                Save (Enter)
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded font-medium transition-colors"
              >
                Cancel (Esc)
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {currentFact.value}
              {currentFact.unit && <span className="text-gray-600 dark:text-gray-400 ml-2">{currentFact.unit}</span>}
            </p>
            {currentFact.status === 'edited' && currentFact.originalValue && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Original: <span className="line-through">{currentFact.originalValue}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Playback controls */}
      {!editingFactId && ttsAvailable && (
        <div className="playback-controls flex justify-center gap-3 mb-6">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            ← Previous (P)
          </button>
          <button
            onClick={handlePlayPause}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium flex items-center gap-2 transition-colors"
          >
            {playbackState === 'playing' ? (
              <>
                <Pause className="w-4 h-4" />
                Pause (Space)
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Play (Space)
              </>
            )}
          </button>
          <button
            onClick={handleNext}
            disabled={isLastFact}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            Next (N) →
          </button>
        </div>
      )}

      {!ttsAvailable && (
        <div className="tts-warning mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            TTS not available. Use keyboard shortcuts to navigate facts.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!editingFactId && currentFact.status === 'pending' && (
        <div className="action-buttons flex gap-3 mb-6">
          <button
            onClick={handleConfirmFact}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-4 h-4" />
            Confirm (C)
          </button>
          <button
            onClick={handleStartEdit}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit (E)
          </button>
          <button
            onClick={handleRejectFact}
            className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" />
            Flag (F)
          </button>
        </div>
      )}

      {/* Final action buttons */}
      <div className="final-actions flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleCancelAll} variant="secondary" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleConfirmAll}
          variant="primary"
          disabled={!allFactsReviewed}
          className="flex-1"
        >
          {allFactsReviewed
            ? `Confirm & Generate Report`
            : `Review ${stats.pendingCount} Remaining`}
        </Button>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="keyboard-help mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs text-gray-600 dark:text-gray-400">
        <p className="font-medium mb-1">Keyboard Shortcuts:</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span><kbd className="font-mono">Space</kbd> Play/Pause</span>
          <span><kbd className="font-mono">C</kbd> Confirm</span>
          <span><kbd className="font-mono">←/P</kbd> Previous</span>
          <span><kbd className="font-mono">E</kbd> Edit</span>
          <span><kbd className="font-mono">→/N</kbd> Next</span>
          <span><kbd className="font-mono">F</kbd> Flag</span>
        </div>
      </div>
    </div>
  );
};

export default AudioProofMode;
