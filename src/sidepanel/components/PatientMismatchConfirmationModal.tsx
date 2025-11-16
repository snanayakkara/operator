/**
 * Patient Mismatch Confirmation Modal
 *
 * Shows a warning when the session's patient name doesn't match
 * the current EMR patient name before inserting text.
 */

import React from 'react';
import { Modal } from './modals';
import { Button } from './buttons';
import { AlertTriangle, User, FileText } from 'lucide-react';
import type { PatientNameComparison } from '@/utils/PatientNameValidator';

interface PatientMismatchConfirmationModalProps {
  isOpen: boolean;
  comparison: PatientNameComparison | null;
  textToInsert: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onRefreshEMR?: () => void;
}

export const PatientMismatchConfirmationModal: React.FC<PatientMismatchConfirmationModalProps> = ({
  isOpen,
  comparison,
  textToInsert,
  onConfirm,
  onCancel,
  onRefreshEMR
}) => {
  if (!comparison) return null;

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityStyles = () => {
    if (comparison.isMatch) {
      return {
        border: 'border-green-200',
        bg: 'bg-green-50',
        iconColor: 'text-green-600',
        title: 'Patient Names Match'
      };
    } else if (comparison.similarityScore > 0.5) {
      return {
        border: 'border-yellow-200',
        bg: 'bg-yellow-50',
        iconColor: 'text-yellow-600',
        title: 'Patient Name Similarity Warning'
      };
    } else {
      return {
        border: 'border-red-200',
        bg: 'bg-red-50',
        iconColor: 'text-red-600',
        title: 'Patient Name Mismatch Warning'
      };
    }
  };

  const styles = getSeverityStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="md"
      header={
        <div className={`w-full -mx-6 -mt-5 px-6 py-4 rounded-t-2xl border-b border-gray-200 ${styles.bg}`}>
          <div className="flex items-center space-x-3">
            <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
            <h3 className="text-lg font-semibold text-gray-900">
              {styles.title}
            </h3>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full -mx-6 -mb-4 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {onRefreshEMR && (
              <Button
                variant="secondary"
                onClick={onRefreshEMR}
              >
                Refresh EMR
              </Button>
            )}

            <Button
              variant={comparison.isMatch ? 'success' : 'danger'}
              onClick={onConfirm}
            >
              {comparison.isMatch ? 'Insert Text' : 'Insert Anyway'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Patient Names Comparison */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Session Patient Name:</span>
          </div>
          <div className="ml-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-medium text-blue-900">
              {comparison.sessionPatientName}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              From dictation session
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Current EMR Patient:</span>
          </div>
          <div className="ml-6 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm font-medium text-green-900">
              {comparison.emrPatientName}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Currently open EMR file
            </div>
          </div>
        </div>

        {/* Similarity Details */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Similarity Score:</span>
            <span className={`text-sm font-bold ${getConfidenceColor(comparison.confidence)}`}>
              {Math.round(comparison.similarityScore * 100)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Confidence Level:</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              comparison.confidence === 'high'
                ? 'bg-green-100 text-green-800'
                : comparison.confidence === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {comparison.confidence.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Warning Messages */}
        {comparison.warnings.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-sm font-medium text-orange-800 mb-2">Warnings:</div>
            <ul className="text-xs text-orange-700 space-y-1">
              {comparison.warnings.map((warning, index) => (
                <li key={index} className="flex items-start space-x-1">
                  <span className="w-1 h-1 bg-orange-600 rounded-full mt-1.5 flex-shrink-0"></span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Text Preview */}
        {textToInsert && (
          <div className="border-t pt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Text to Insert:</div>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto border border-gray-200">
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {textToInsert.length > 200
                  ? `${textToInsert.substring(0, 200)}...`
                  : textToInsert
                }
              </div>
              {textToInsert.length > 200 && (
                <div className="text-xs text-gray-500 mt-1">
                  Showing first 200 characters ({textToInsert.length} total)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Warning Message */}
        <div className={`p-3 rounded-lg border ${
          comparison.isMatch
            ? 'bg-green-100 border-green-200'
            : 'bg-red-100 border-red-200'
        }`}>
          <div className={`text-sm ${
            comparison.isMatch ? 'text-green-800' : 'text-red-800'
          }`}>
            {comparison.isMatch ? (
              'The patient names appear to match. You can proceed with inserting the text.'
            ) : (
              'You are about to insert session results into a potentially different patient\'s EMR file. Please verify this is intentional.'
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
