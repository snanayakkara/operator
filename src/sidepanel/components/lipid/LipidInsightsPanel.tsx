import React from 'react';
import type { LipidInsightsSummary } from '@/types/LipidTypes';
import { Info } from 'lucide-react';

interface LipidInsightsPanelProps {
  summary: LipidInsightsSummary | null;
}

export const LipidInsightsPanel: React.FC<LipidInsightsPanelProps> = ({ summary }) => {
  if (!summary) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-900">Clinical Insights</h3>
      </div>
      <ul className="space-y-2 text-sm text-gray-900">
        <li><strong className="text-gray-700">Latest status:</strong> {summary.latestSummary}</li>
        <li><strong className="text-gray-700">Change vs prior:</strong> {summary.priorComparison}</li>
        <li><strong className="text-gray-700">Baseline context:</strong> {summary.baselineComparison}</li>
        <li><strong className="text-gray-700">Trajectory:</strong> {summary.trajectory}</li>
        <li><strong className="text-gray-700">Time in target:</strong> {summary.timeInTarget}</li>
        {summary.therapyResponse && (
          <li><strong className="text-gray-700">Therapy response:</strong> {summary.therapyResponse}</li>
        )}
        {summary.nadirAndRise && (
          <li><strong className="text-gray-700">Notable points:</strong> {summary.nadirAndRise}</li>
        )}
        {summary.riskContext && (
          <li><strong className="text-gray-700">Risk context:</strong> {summary.riskContext}</li>
        )}
        <li><strong className="text-gray-700">Why LDL matters:</strong> {summary.whyItMatters}</li>
      </ul>
    </div>
  );
};
