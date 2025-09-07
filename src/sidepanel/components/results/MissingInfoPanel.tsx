import React, { useMemo, useState } from 'react';

interface MissingInfoPanelProps {
  missingInfo: any;
  onSubmit: (answers: Record<string, string>) => void;
  onDismiss?: () => void;
}

export const MissingInfoPanel: React.FC<MissingInfoPanelProps> = ({ missingInfo, onSubmit, onDismiss }) => {
  const questions = useMemo(() => {
    const q: string[] = [];
    
    // Handle AngiogramPCI format
    if (Array.isArray(missingInfo?.missing_diagnostic)) {
      q.push(...missingInfo.missing_diagnostic);
    }
    if (Array.isArray(missingInfo?.missing_intervention)) {
      q.push(...missingInfo.missing_intervention);
    }
    
    // Handle Quick Letter format
    if (Array.isArray(missingInfo?.missing_purpose)) {
      q.push(...missingInfo.missing_purpose);
    }
    if (Array.isArray(missingInfo?.missing_clinical)) {
      q.push(...missingInfo.missing_clinical);
    }
    if (Array.isArray(missingInfo?.missing_recommendations)) {
      q.push(...missingInfo.missing_recommendations);
    }
    
    return q;
  }, [missingInfo]);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleChange = (q: string, value: string) => {
    setAnswers(prev => ({ ...prev, [q]: value }));
  };

  const completeness = missingInfo?.completeness_score || '';

  if (questions.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50">
      <div className="p-3 border-b border-amber-200 bg-amber-100 flex items-center justify-between">
        <div>
          <h4 className="text-amber-900 font-semibold text-sm">Missing Information</h4>
          {completeness && (
            <p className="text-amber-700 text-xs">Completeness: {completeness}</p>
          )}
        </div>
        {onDismiss && (
          <button
            className="text-amber-700 text-xs underline"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        )}
      </div>
      <div className="p-3 space-y-3">
        {questions.map((q) => (
          <div key={q} className="space-y-1">
            <label className="text-xs font-medium text-amber-900 block">{q}</label>
            <input
              type="text"
              className="w-full text-sm p-2 border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              placeholder="Add detail..."
              value={answers[q] || ''}
              onChange={(e) => handleChange(q, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-amber-200 bg-amber-50 flex items-center justify-end space-x-2">
        {onDismiss && (
          <button
            className="px-3 py-2 text-xs rounded border border-amber-200 bg-white hover:bg-amber-50"
            onClick={onDismiss}
          >
            Skip for now
          </button>
        )}
        <button
          className="px-3 py-2 text-xs rounded bg-amber-600 text-white hover:bg-amber-700"
          onClick={() => onSubmit(answers)}
        >
          Reprocess with answers
        </button>
      </div>
    </div>
  );
};

