import React, { useState } from 'react';
import { Loader2, Mic, StopCircle, X } from 'lucide-react';
import Button from '../buttons/Button';
import { RoundsPatient, WardUpdateDiff } from '@/types/rounds.types';
import { RoundsLLMService } from '@/services/RoundsLLMService';
import { useRounds } from '@/contexts/RoundsContext';
import { useRecorder } from '@/hooks/useRecorder';
import { LMStudioService } from '@/services/LMStudioService';

interface WardUpdateModalProps {
  open: boolean;
  onClose: () => void;
  patient: RoundsPatient;
}

const renderPreviewList = (diff: WardUpdateDiff) => (
  <div className="space-y-2 text-sm text-gray-800">
    {diff.issuesAdded.length > 0 && (
      <div>
        <div className="font-semibold">Issues to add</div>
        <ul className="list-disc pl-5">
          {diff.issuesAdded.map(issue => (
            <li key={issue.id}>{issue.title}</li>
          ))}
        </ul>
      </div>
    )}
    {diff.issuesUpdated.length > 0 && (
      <div>
        <div className="font-semibold">Issue updates</div>
        <ul className="list-disc pl-5">
          {diff.issuesUpdated.map(update => (
            <li key={update.issueId}>
              {update.newStatus && <span>Status → {update.newStatus}. </span>}
              {update.newSubpoints?.length ? `${update.newSubpoints.length} new notes` : null}
            </li>
          ))}
        </ul>
      </div>
    )}
    {diff.investigationsAdded.length > 0 && (
      <div>
        <div className="font-semibold">Investigations to add</div>
        <ul className="list-disc pl-5">
          {diff.investigationsAdded.map(inv => (
            <li key={inv.id}>{inv.name}</li>
          ))}
        </ul>
      </div>
    )}
    {diff.investigationsUpdated.length > 0 && (
      <div>
        <div className="font-semibold">Investigation updates</div>
        <ul className="list-disc pl-5">
          {diff.investigationsUpdated.map(update => (
            <li key={update.investigationId}>
              {update.newLabValues?.length ? `${update.newLabValues.length} lab values` : ''}
              {update.newSummaryText ? `Summary: ${update.newSummaryText}` : ''}
            </li>
          ))}
        </ul>
      </div>
    )}
    {diff.tasksAdded.length > 0 && (
      <div>
        <div className="font-semibold">Tasks to add</div>
        <ul className="list-disc pl-5">
          {diff.tasksAdded.map(task => (
            <li key={task.id}>{task.text}</li>
          ))}
        </ul>
      </div>
    )}
    {(diff.tasksCompletedById.length > 0 || (diff.tasksCompletedByText?.length ?? 0) > 0) && (
      <div>
        <div className="font-semibold">Tasks to mark done</div>
        <ul className="list-disc pl-5">
          {diff.tasksCompletedById.map(id => <li key={id}>Task #{id}</li>)}
          {diff.tasksCompletedByText?.map(text => <li key={text}>{text}</li>)}
        </ul>
      </div>
    )}
    {diff.tasksUpdated.length > 0 && (
      <div>
        <div className="font-semibold">Task edits</div>
        <ul className="list-disc pl-5">
          {diff.tasksUpdated.map(update => (
            <li key={update.taskId}>{update.newText || 'Update task'}</li>
          ))}
        </ul>
      </div>
    )}
    {Object.values(diff).every(arr => Array.isArray(arr) ? arr.length === 0 : !arr) && (
      <p className="text-sm text-gray-500">No changes detected.</p>
    )}
  </div>
);

export const WardUpdateModal: React.FC<WardUpdateModalProps> = ({ open, onClose, patient }) => {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<WardUpdateDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<string | null>(null);
  const { applyWardDiff } = useRounds();
  const llm = RoundsLLMService.getInstance();
  const recorder = useRecorder({
    onRecordingComplete: async (audioBlob) => {
      setRecording(false);
      setTranscribing(true);
      setDictationStatus('Transcribing with Whisper…');
      try {
        const transcriptText = await LMStudioService.getInstance().transcribeAudio(audioBlob, undefined, 'rounds-ward-update');
        setTranscript(transcriptText);
        setDictationStatus('Parsing ward update…');
        const parsed = await llm.parseWardUpdate(transcriptText, patient);
        setDiff(parsed);
        setDictationStatus('Ready to apply');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to transcribe ward update');
      } finally {
        setTranscribing(false);
      }
    },
    onError: (err: Error) => {
      setRecording(false);
      setTranscribing(false);
      setDictationStatus(null);
      setError(err.message || 'Recording failed');
    }
  });

  if (!open) return null;

  const handleParse = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = await llm.parseWardUpdate(transcript, patient);
      setDiff(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse update');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordToggle = () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
      setRecording(false);
    } else {
      setError(null);
      setDiff(null);
      setDictationStatus('Recording…');
      setRecording(true);
      recorder.startRecording();
    }
  };

  const handleApply = async () => {
    if (!diff) return;
    await applyWardDiff(patient.id, diff, transcript);
    onClose();
    setTranscript('');
    setDiff(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <div className="text-xs text-gray-500">Ward update</div>
            <div className="text-base font-semibold text-gray-900">{patient.name}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close ward update modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant={recorder.isRecording ? 'secondary' : 'outline'}
              size="sm"
              startIcon={recorder.isRecording ? StopCircle : Mic}
              onClick={handleRecordToggle}
            >
              {recorder.isRecording ? 'Stop recording' : 'Dictate ward update'}
            </Button>
            {dictationStatus && <span className="text-sm text-gray-600">{dictationStatus}</span>}
            {transcribing && <Loader2 className="w-4 h-4 animate-spin text-gray-600" />}
          </div>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Dictation transcript..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Output stays local; structured diff is previewed before apply.</div>
              <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleParse} disabled={loading || !transcript.trim() || transcribing}>
                {loading || transcribing ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {transcribing ? 'Transcribing…' : 'Parsing...'}</> : 'Parse update'}
              </Button>
            </div>
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}

          {diff && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
              <div className="text-sm font-semibold text-gray-900">Proposed updates</div>
              {renderPreviewList(diff)}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDiff(null)}>Reset</Button>
                <Button size="sm" onClick={handleApply}>Apply</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
