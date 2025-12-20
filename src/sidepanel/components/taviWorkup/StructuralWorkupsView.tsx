/**
 * Structural Workups View - Phase 1 with Detail Editor
 *
 * Main container for TAVI Workup list + detail view.
 * Pattern mirrors RoundsView with collapsible sidebar + full-width detail panel.
 *
 * Phase 1: List view + detail editor with basic metadata display
 * Phase 2: Add Notion patient list
 * Phase 3: Add EMR auto-extraction + section editing
 */

import React, { useState } from 'react';
import { X, Heart, Plus, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import Button from '../buttons/Button';
import { useTAVIWorkup } from '@/contexts/TAVIWorkupContext';
import { TAVIWorkupDetailEditor } from './TAVIWorkupDetailEditor';
import { NotionPatientCard } from './NotionPatientCard';

interface StructuralWorkupsViewProps {
  onClose: () => void;
}

export const StructuralWorkupsView: React.FC<StructuralWorkupsViewProps> = ({ onClose }) => {
  const {
    workups,
    loading,
    createWorkup,
    selectedWorkupId,
    setSelectedWorkupId,
    notionAvailable,
    notionPatients,
    refreshNotionList
  } = useTAVIWorkup();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notionSectionExpanded, setNotionSectionExpanded] = useState(true);

  const handleCreateDemoWorkup = async () => {
    await createWorkup({
      notionPageId: 'demo-page-id',
      notionUrl: 'https://notion.so/demo',
      patient: 'Demo Patient',
      referralDate: '2025-01-15',
      referrer: 'Dr. Smith',
      location: 'Cabrini',
      procedureDate: '2025-02-01',
      status: 'Pending',
      category: 'Elective',
      readyToPresent: false,
      lastEditedTime: Date.now()
    });
  };

  const handleSelectWorkup = (workupId: string) => {
    setSelectedWorkupId(workupId);
    setSidebarOpen(false); // Auto-collapse sidebar on selection
  };

  const handleBackToList = () => {
    setSelectedWorkupId(null);
    setSidebarOpen(true);
  };

  const handleImportNotionPatient = async (patient: typeof notionPatients[0]) => {
    await createWorkup(patient);
  };

  // Check if a Notion patient is already imported
  const isPatientImported = (notionPageId: string) => {
    return workups.some(w => w.notionPageId === notionPageId);
  };

  // Show detail editor if workup is selected
  if (selectedWorkupId) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <TAVIWorkupDetailEditor workupId={selectedWorkupId} onBack={handleBackToList} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line-primary bg-white">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-purple-600" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-ink-primary">Structural Workups</span>
            <span className="text-xs text-ink-tertiary">TAVI, PFO, mTEER workup management</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} icon={<X className="w-4 h-4" />}>
            Close
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-ink-tertiary">Loading workups...</div>
          </div>
        ) : workups.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center">
              <Heart className="w-10 h-10 text-purple-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-ink-primary">No Workups Yet</h3>
              <p className="text-sm text-ink-secondary">
                Create your first TAVI workup to get started. Workups sync with your Notion Structural Workup database.
              </p>
            </div>
            <Button onClick={handleCreateDemoWorkup} icon={<Plus className="w-4 h-4" />}>
              Create Demo Workup
            </Button>
            <div className="pt-4 text-xs text-ink-tertiary">
              <strong>Phase 1 Complete:</strong> Storage, Context, and Navigation working
              <br />
              <strong>Coming in Phase 2:</strong> Notion patient sync
              <br />
              <strong>Coming in Phase 3:</strong> Detail editor with EMR auto-extraction
            </div>
          </div>
        ) : (
          // Workup list (Phase 1: basic display)
          <div className="space-y-4">
            {/* Notion Patient Import Section */}
            {notionAvailable && notionPatients.length > 0 && (
              <div className="bg-white border border-line-primary rounded-lg">
                <button
                  type="button"
                  onClick={() => setNotionSectionExpanded(!notionSectionExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-ink-primary">
                      Import from Notion ({notionPatients.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        refreshNotionList();
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                      aria-label="Refresh Notion patient list"
                    >
                      <RefreshCw className="w-3 h-3 text-ink-tertiary" />
                    </button>
                    {notionSectionExpanded ? (
                      <ChevronUp className="w-4 h-4 text-ink-tertiary" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-ink-tertiary" />
                    )}
                  </div>
                </button>
                {notionSectionExpanded && (
                  <div className="p-3 pt-0 space-y-2 max-h-80 overflow-y-auto">
                    {notionPatients.map(patient => (
                      <NotionPatientCard
                        key={patient.notionPageId}
                        patient={patient}
                        onImport={handleImportNotionPatient}
                        alreadyImported={isPatientImported(patient.notionPageId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* All Workups Section */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink-primary">
                All Workups ({workups.length})
              </h4>
              <Button size="sm" onClick={handleCreateDemoWorkup} icon={<Plus className="w-4 h-4" />}>
                New Workup
              </Button>
            </div>
            <div className="space-y-2">
              {workups.map(workup => (
                <button
                  key={workup.id}
                  type="button"
                  onClick={() => handleSelectWorkup(workup.id)}
                  className="w-full bg-white border border-line-primary rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all text-left"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-ink-primary">{workup.patient}</div>
                      <div className="text-sm text-ink-secondary mt-1">
                        {workup.procedureDate ? `Procedure: ${workup.procedureDate}` : 'No procedure date'}
                      </div>
                      <div className="text-xs text-ink-tertiary mt-1">
                        {workup.location && `${workup.location} • `}
                        {workup.status}
                      </div>
                    </div>
                    <div className="text-xs text-ink-tertiary">
                      {workup.completionPercentage}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
