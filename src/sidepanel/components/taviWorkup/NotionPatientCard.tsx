/**
 * Notion Patient Card - Phase 2
 *
 * Compact card showing Notion patient ready for import.
 * Click to create new workup linked to Notion patient.
 */

import React from 'react';
import { Download, Calendar, MapPin, User } from 'lucide-react';
import Button from '../buttons/Button';
import type { NotionTAVIPatient } from '@/types/taviWorkup.types';

interface NotionPatientCardProps {
  patient: NotionTAVIPatient;
  onImport: (patient: NotionTAVIPatient) => void;
  alreadyImported?: boolean;
}

export const NotionPatientCard: React.FC<NotionPatientCardProps> = ({
  patient,
  onImport,
  alreadyImported = false
}) => {
  return (
    <div className="bg-white border border-line-primary rounded-lg p-3">
      <div className="space-y-2">
        {/* Patient Name */}
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-ink-primary text-sm">{patient.patient}</div>
            {patient.status && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                patient.status === 'Pending' ? 'bg-gray-100 text-gray-700' :
                patient.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {patient.status}
              </span>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-xs text-ink-secondary">
          {patient.procedureDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-ink-tertiary" />
              <span>Procedure: {patient.procedureDate}</span>
            </div>
          )}
          {patient.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-ink-tertiary" />
              <span>{patient.location}</span>
            </div>
          )}
          {patient.referrer && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-ink-tertiary" />
              <span>{patient.referrer}</span>
            </div>
          )}
        </div>

        {/* Import Button */}
        <Button
          size="sm"
          variant={alreadyImported ? 'outline' : 'primary'}
          onClick={() => onImport(patient)}
          disabled={alreadyImported}
          icon={<Download className="w-3 h-3" />}
          className="w-full"
        >
          {alreadyImported ? 'Already Imported' : 'Import Workup'}
        </Button>
      </div>
    </div>
  );
};
