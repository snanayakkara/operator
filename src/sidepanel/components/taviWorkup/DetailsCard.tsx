/**
 * Details Card - Referral Information & Workup Metadata
 *
 * Displays:
 * - Editable: Referral date, Referring practitioner (from Clinicians)
 * - Read-only: Creation date, Last updated, Status, Author (synced from Notion)
 */

import React, { useState, useCallback } from 'react';
import { FileText, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import Button from '../buttons/Button';
import Combobox from '../forms/Combobox';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import type { Clinician } from '@/types/rounds.types';

interface DetailsCardProps {
  workup: TAVIWorkupItem;
  clinicians: Clinician[];
  onUpdate: (updater: (w: TAVIWorkupItem) => TAVIWorkupItem) => Promise<void>;
}

export const DetailsCard: React.FC<DetailsCardProps> = ({
  workup,
  clinicians,
  onUpdate
}) => {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const resolveReferrerName = useCallback(() => {
    if (workup.referringPractitionerId) {
      const clinician = clinicians.find(c => c.id === workup.referringPractitionerId);
      if (clinician?.name) return clinician.name;
    }
    return workup.referrer || '';
  }, [workup.referringPractitionerId, workup.referrer, clinicians]);

  const [referralDate, setReferralDate] = useState(workup.referralDate || '');
  const [referringPractitionerId, setReferringPractitionerId] = useState(workup.referringPractitionerId || '');
  const [referrerName, setReferrerName] = useState(() => resolveReferrerName());
  const [procedureDate, setProcedureDate] = useState(workup.procedureDate || '');
  const [datePresented, setDatePresented] = useState(workup.datePresented || '');
  const [location, setLocation] = useState(workup.location || '');
  const [category, setCategory] = useState(workup.category || '');
  const [status, setStatus] = useState(workup.status || 'Undergoing Workup');
  const [notes, setNotes] = useState(workup.notes || '');

  const hasReferralData = workup.referralDate || workup.referringPractitionerId || workup.referrer;

  const handleStartEdit = useCallback(() => {
    setReferralDate(workup.referralDate || '');
    setReferringPractitionerId(workup.referringPractitionerId || '');
    setReferrerName(resolveReferrerName());
    setProcedureDate(workup.procedureDate || '');
    setDatePresented(workup.datePresented || '');
    setLocation(workup.location || '');
    setCategory(workup.category || '');
    setStatus(workup.status || 'Undergoing Workup');
    setNotes(workup.notes || '');
    setIsEditing(true);
  }, [
    workup.referralDate,
    workup.referringPractitionerId,
    workup.procedureDate,
    workup.datePresented,
    workup.location,
    workup.category,
    workup.status,
    workup.notes,
    resolveReferrerName
  ]);

  const handleSave = useCallback(async () => {
    const trimmedReferrer = referrerName.trim();
    const hasClinicianSelection = Boolean(referringPractitionerId.trim());
    const clinicianName = hasClinicianSelection
      ? clinicians.find(c => c.id === referringPractitionerId)?.name
      : undefined;
    const resolvedReferrer = clinicianName || trimmedReferrer;

    await onUpdate(w => ({
      ...w,
      status: status.trim() || 'Undergoing Workup',
      category: category.trim() || undefined,
      location: location.trim() || undefined,
      procedureDate: procedureDate || undefined,
      datePresented: datePresented || undefined,
      referralDate: referralDate || undefined,
      referringPractitionerId: hasClinicianSelection ? referringPractitionerId : undefined,
      referrer: resolvedReferrer ? resolvedReferrer : undefined,
      notes: notes.trim() || undefined
    }));
    setIsEditing(false);
  }, [
    category,
    clinicians,
    datePresented,
    location,
    notes,
    procedureDate,
    referralDate,
    referringPractitionerId,
    referrerName,
    status,
    onUpdate
  ]);

  const handleCancel = useCallback(() => {
    setReferralDate(workup.referralDate || '');
    setReferringPractitionerId(workup.referringPractitionerId || '');
    setReferrerName(resolveReferrerName());
    setProcedureDate(workup.procedureDate || '');
    setDatePresented(workup.datePresented || '');
    setLocation(workup.location || '');
    setCategory(workup.category || '');
    setStatus(workup.status || 'Undergoing Workup');
    setNotes(workup.notes || '');
    setIsEditing(false);
  }, [
    workup.referralDate,
    workup.referringPractitionerId,
    workup.procedureDate,
    workup.datePresented,
    workup.location,
    workup.category,
    workup.status,
    workup.notes,
    resolveReferrerName
  ]);

  // Format Unix timestamp to readable date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Find clinician name by ID
  const getReferringPractitionerName = () => {
    if (workup.referringPractitionerId) {
      const clinician = clinicians.find(c => c.id === workup.referringPractitionerId);
      if (clinician?.name) return clinician.name;
    }
    return workup.referrer || '-';
  };

  const comboboxValue = referringPractitionerId
    ? (clinicians.find(c => c.id === referringPractitionerId)?.name || referrerName)
    : referrerName;

  return (
    <div className="bg-white rounded-lg border border-line-primary overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
          hasReferralData ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-gray-50 border-l-4 border-l-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ink-primary">Details</h3>
            <p className="text-xs text-ink-tertiary">
              {hasReferralData ? 'Referral information entered' : 'No referral information'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit();
              }}
              icon={<Edit2 className="w-3 h-3" />}
            >
              Edit
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-ink-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink-tertiary" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 border-t border-line-primary">
          <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3">
            {/* Editable Fields */}
            <label className="text-sm font-medium text-gray-700 pt-2">Status:</label>
            {isEditing ? (
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {workup.status || 'Undergoing Workup'}
              </div>
            )}

            <label className="text-sm font-medium text-gray-700 pt-2">Category:</label>
            {isEditing ? (
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {workup.category || '-'}
              </div>
            )}

            <label className="text-sm font-medium text-gray-700 pt-2">Location:</label>
            {isEditing ? (
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {workup.location || '-'}
              </div>
            )}

            <label className="text-sm font-medium text-gray-700 pt-2">Procedure Date:</label>
            {isEditing ? (
              <input
                type="date"
                value={procedureDate}
                onChange={(e) => setProcedureDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {workup.procedureDate || '-'}
              </div>
            )}

            <label className="text-sm font-medium text-gray-700 pt-2">Date Presented:</label>
            {isEditing ? (
              <input
                type="date"
                value={datePresented}
                onChange={(e) => setDatePresented(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {workup.datePresented || '-'}
              </div>
            )}

            <label className="text-sm font-medium text-gray-700 pt-2">Referral Date:</label>
            {isEditing ? (
              <input
                type="date"
                value={referralDate}
                onChange={(e) => setReferralDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {workup.referralDate || '-'}
              </div>
            )}

            <label className="text-sm font-medium text-gray-700 pt-2">Referring Practitioner:</label>
            {isEditing ? (
              <Combobox
                options={clinicians.map(c => c.name)}
                value={comboboxValue}
                onChange={(name) => {
                  const clinician = clinicians.find(c => c.name === name);
                  setReferringPractitionerId(clinician?.id || '');
                  setReferrerName(name);
                }}
                placeholder="Select or type practitioner name"
                size="sm"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {getReferringPractitionerName()}
              </div>
            )}

            <label className="text-sm font-medium text-gray-700 pt-2">Notes:</label>
            {isEditing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900 whitespace-pre-wrap">
                {workup.notes || '-'}
              </div>
            )}

            {/* Divider */}
            <div className="col-span-2 border-t border-gray-200 my-2" />

            {/* Read-only Fields */}
            <label className="text-sm text-gray-500 pt-2">Created:</label>
            <div className="px-3 py-2 text-sm text-gray-700">
              {formatDate(workup.createdAt)}
            </div>

            <label className="text-sm text-gray-500 pt-2">Last Updated:</label>
            <div className="px-3 py-2 text-sm text-gray-700">
              {formatDate(workup.lastUpdatedAt)}
            </div>
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                icon={<X className="w-3 h-3" />}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                icon={<Check className="w-3 h-3" />}
              >
                Save
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
