import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCopy, Loader2, RefreshCw, ShieldCheck, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import { OptimizationService } from '@/services/OptimizationService';
import type { ASRCorrectionsEntry } from '@/types/optimization';

const CommandBlock: React.FC<{ title: string; cmd: string }> = ({ title, cmd }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch (_) {
      // ignore
    }
  };

  return (
    <div className="bg-surface-secondary border border-line-primary rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink-primary">{title}</span>
        <button
          onClick={handleCopy}
          className="text-ink-secondary hover:text-ink-primary flex items-center gap-1 text-xs"
        >
          <ClipboardCopy className="w-4 h-4" />
          Copy
        </button>
      </div>
      <code className="block text-xs bg-surface-tertiary rounded px-3 py-2 text-ink-primary break-words">
        {cmd}
      </code>
    </div>
  );
};

export const WhisperTrainingPanel: React.FC = () => {
  const optimizationService = useMemo(() => OptimizationService.getInstance(), []);
  const [corrections, setCorrections] = useState<ASRCorrectionsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await optimizationService.exportCorrections();
      setCorrections(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load corrections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const audioAttached = corrections.filter(c => c.audioPath).length;
  const total = corrections.length;

  const baseCmd = `python whisper_overnight_lora.py --model-id openai/whisper-large-v3 --data-dir data/asr --output-dir data/whisper-lora-output --max-hours 8 --per-device-train-batch-size 1 --gradient-accumulation-steps 4`;
  const resumeCmd = `${baseCmd} --resume-from-checkpoint data/whisper-lora-output/checkpoint-LAST`;
  const cleanupCmd = `./cleanup-asr-audio.sh`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-ink-primary">Whisper Fine-tune (LoRA)</h3>
          <p className="text-sm text-ink-secondary">
            Confirm dataset health, then run the overnight script locally. This does not start training from the browser.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-surface-secondary border border-line-primary rounded-md text-sm text-ink-primary hover:bg-white disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 border border-line-primary rounded-lg bg-surface-secondary">
          <div className="flex items-center gap-2 text-ink-secondary text-sm mb-2">
            <HardDrive className="w-4 h-4" />
            Dataset
          </div>
          <div className="text-3xl font-semibold text-ink-primary">{total}</div>
          <div className="text-xs text-ink-secondary mt-1">Total corrections</div>
        </div>

        <div className="p-4 border border-line-primary rounded-lg bg-surface-secondary">
          <div className="flex items-center gap-2 text-ink-secondary text-sm mb-2">
            <ShieldCheck className="w-4 h-4" />
            Audio Attached
          </div>
          <div className="text-3xl font-semibold text-ink-primary">{audioAttached}</div>
          <div className="text-xs text-ink-secondary mt-1">Have an audioPath saved on server</div>
          {audioAttached === 0 && (
            <div className="mt-2 text-xs text-amber-700 flex gap-1 items-center">
              <AlertTriangle className="w-4 h-4" />
              No audio attached yet; ingest corrections with audio before training.
            </div>
          )}
        </div>

        <div className="p-4 border border-line-primary rounded-lg bg-surface-secondary">
          <div className="flex items-center gap-2 text-ink-secondary text-sm mb-2">
            <Trash2 className="w-4 h-4" />
            Cleanup
          </div>
          <div className="text-sm text-ink-secondary">
            Use the cleanup helper after training to reclaim disk space.
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CommandBlock title="Start 8h LoRA (M2-friendly)" cmd={baseCmd} />
        <CommandBlock title="Resume from last checkpoint" cmd={resumeCmd} />
        <CommandBlock title="Tail training logs" cmd={`tail -f data/whisper-lora-output/trainer_state.json`} />
        <CommandBlock title="Cleanup saved audio" cmd={cleanupCmd} />
      </div>

      <div className="p-4 border border-dashed border-line-primary rounded-lg text-sm text-ink-secondary space-y-2">
        <div className="font-medium text-ink-primary">Tips</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Keep the laptop plugged in; screen can be off. Metal/MPS is used automatically when available.</li>
          <li>Batch is fixed at 1 with gradient accumulation (4) to fit 32GB RAM; adjust only if you know it fits.</li>
          <li>Checkpoints are capped (save_total_limit=3). Swap in the latest adapter after training.</li>
        </ul>
      </div>
    </div>
  );
};
