import React, { useState } from 'react';
import { Loader2, Mic, StopCircle, X } from 'lucide-react';
import Button from '../buttons/Button';
import { RoundsPatient, WardUpdateDiff } from '@/types/rounds.types';
import { useRounds } from '@/contexts/RoundsContext';
import { useRecorder } from '@/hooks/useRecorder';
import { LMStudioService } from '@/services/LMStudioService';

interface WardUpdateModalProps {
  open: boolean;
  onClose: () => void;
  patient: RoundsPatient;
}

const renderPreviewList = (diff: WardUpdateDiff) => {
  const hasAny =
    diff.issuesAdded.length > 0 ||
    diff.issuesUpdated.length > 0 ||
    diff.investigationsAdded.length > 0 ||
    diff.investigationsUpdated.length > 0 ||
    diff.tasksAdded.length > 0 ||
    diff.tasksUpdated.length > 0 ||
    diff.tasksCompletedById.length > 0 ||
    (diff.tasksCompletedByText?.length ?? 0) > 0 ||
    Boolean(diff.eddUpdate?.newDate) ||
    (diff.checklistSkips?.length ?? 0) > 0 ||
    Boolean(diff.admissionFlags);

  return (
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
      {diff.eddUpdate?.newDate && (
        <div>
          <div className="font-semibold">Expected discharge date</div>
          <p className="pl-1">{diff.eddUpdate.oldDate ? `Update EDD to ${diff.eddUpdate.newDate} (was ${diff.eddUpdate.oldDate})` : `Set EDD to ${diff.eddUpdate.newDate}`}</p>
        </div>
      )}
      {diff.admissionFlags && (
        <div>
          <div className="font-semibold">Admission flags</div>
          <ul className="list-disc pl-5">
            {'dvtProphylaxisConsidered' in diff.admissionFlags && diff.admissionFlags.dvtProphylaxisConsidered !== undefined && (
              <li>DVT prophylaxis considered: {diff.admissionFlags.dvtProphylaxisConsidered ? 'yes' : 'no'}</li>
            )}
            {'followupArranged' in diff.admissionFlags && diff.admissionFlags.followupArranged !== undefined && (
              <li>Follow-up arranged: {diff.admissionFlags.followupArranged ? 'yes' : 'no'}</li>
            )}
          </ul>
        </div>
      )}
      {(diff.checklistSkips?.length ?? 0) > 0 && (
        <div>
          <div className="font-semibold">Skip for this admission</div>
          <ul className="list-disc pl-5">
            {diff.checklistSkips?.map(skip => (
              <li key={`${skip.condition || 'base'}-${skip.itemId}`}>
                {skip.itemId} {skip.condition ? `(${skip.condition})` : ''}{skip.reason ? ` – ${skip.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!hasAny && (
        <p className="text-sm text-gray-500">No changes detected.</p>
      )}
    </div>
  );
};

export const WardUpdateModal: React.FC<WardUpdateModalProps> = ({ open, onClose, patient }) => {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<WardUpdateDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<string | null>(null);
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);
  const [humanSummary, setHumanSummary] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { runWardDictation, applyWardConversation, discardWardConversation, applyWardDiff } = useRounds();
  const resetSession = () => {
    if (sessionId) {
      discardWardConversation(sessionId);
    }
    setSessionId(null);
    setDiff(null);
    setAssistantMessage(null);
    setHumanSummary([]);
    setDictationStatus(null);
    setError(null);
  };

  const applyParsedTurn = (result: { session: { id: string }; turn: { diff: WardUpdateDiff; assistantMessage?: string; humanSummary?: string[] } }) => {
    setSessionId(result.session.id);
    setDiff(result.turn.diff);
    setAssistantMessage(result.turn.assistantMessage || null);
    setHumanSummary(result.turn.humanSummary || []);
  };

  const recorder = useRecorder({
    onRecordingComplete: async (audioBlob) => {
      setTranscribing(true);
      setDictationStatus('Transcribing with Whisper…');
      try {
        const transcriptText = await LMStudioService.getInstance().transcribeAudio(audioBlob, undefined, 'rounds-ward-update');
        setTranscript(transcriptText);
        setDictationStatus('Parsing ward update…');
        const parsed = await runWardDictation(patient.id, transcriptText, sessionId || undefined);
        applyParsedTurn(parsed);
        setDictationStatus('Ready to apply');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to transcribe ward update');
      } finally {
        setTranscribing(false);
      }
    },
    onError: (err: Error) => {
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
      const parsed = await runWardDictation(patient.id, transcript, sessionId || undefined);
      applyParsedTurn(parsed);
      setDictationStatus('Ready to apply');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse update');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordToggle = () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
    } else {
      setError(null);
      resetSession();
      setDictationStatus('Recording…');
      recorder.startRecording();
    }
  };

  const handleApply = async () => {
    if (!diff) return;
    if (sessionId) {
      await applyWardConversation(sessionId, transcript);
    } else {
      await applyWardDiff(patient.id, diff, transcript);
    }
    resetSession();
    setTranscript('');
    onClose();
  };

  const handleClose = () => {
    resetSession();
    setTranscript('');
    onClose();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-200">
      {/* Subtle backdrop that doesn't block clicks on content above */}
      <div 
        className="fixed inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" 
        aria-hidden="true" 
      />
      
      <div className="relative bg-white border-t border-gray-200 shadow-lg max-h-[60vh] overflow-y-auto">
        {/* Header row */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs text-gray-500">Ward update</span>
              <span className="mx-2 text-gray-300">•</span>
              <span className="text-sm font-medium text-gray-900">{patient.name}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close ward update"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Recording controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant={recorder.isRecording ? 'danger' : 'primary'}
              size="sm"
              startIcon={recorder.isRecording ? StopCircle : Mic}
              onClick={handleRecordToggle}
              className="shrink-0"
            >
              {recorder.isRecording ? 'Stop' : 'Dictate'}
            </Button>
            {dictationStatus && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {transcribing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{dictationStatus}</span>
              </div>
            )}
          </div>

          {/* Transcript input */}
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors"
            placeholder="Dictation transcript..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-gray-400 max-w-[200px]">
              Output stays local; structured diff is previewed before apply.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleParse} 
                disabled={loading || !transcript.trim() || transcribing}
                isLoading={loading || transcribing}
              >
                {transcribing ? 'Transcribing' : loading ? 'Parsing' : 'Parse'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {assistantMessage && (
            <div className="border border-blue-100 rounded-lg p-3 bg-blue-50/70 space-y-1">
              <div className="text-sm font-semibold text-blue-900">Assistant</div>
              <p className="text-sm text-blue-900">{assistantMessage}</p>
              {humanSummary.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-blue-900">
                  {humanSummary.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {diff && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
              <div className="text-sm font-semibold text-gray-900">Proposed updates</div>
              {renderPreviewList(diff)}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={resetSession}>
                  Reset
                </Button>
                <Button variant="success" size="sm" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
