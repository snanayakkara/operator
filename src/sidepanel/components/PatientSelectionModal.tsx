import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Star,
  Filter,
  Play,
  Loader2
} from 'lucide-react';
import type { PatientAppointment } from '@/types/medical.types';
import {
  modalVariants,
  backdropVariants,
  staggerContainer as _staggerContainer,
  listItemVariants as _listItemVariants,
  buttonVariants as _buttonVariants,
  textVariants,
  withReducedMotion,
  STAGGER_CONFIGS as _STAGGER_CONFIGS,
  ANIMATION_DURATIONS as _ANIMATION_DURATIONS
} from '@/utils/animations';

interface PatientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartReview: (selectedPatients: PatientAppointment[]) => void;
  calendarData?: {
    appointmentDate: string;
    patients: PatientAppointment[];
    totalCount: number;
    calendarUrl?: string;
  } | null;
  isExtracting?: boolean;
  extractError?: string | null;
}

export const PatientSelectionModal: React.FC<PatientSelectionModalProps> = ({
  isOpen,
  onClose,
  onStartReview,
  calendarData,
  isExtracting = false,
  extractError
}) => {
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'new' | 'routine'>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset selections when modal opens/closes or data changes
  useEffect(() => {
    if (isOpen && calendarData) {
      setSelectedPatients(new Set());
      setFilter('all');
    }
  }, [isOpen, calendarData]);

  if (!isOpen) return null;

  const handlePatientToggle = (fileNumber: string) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(fileNumber)) {
      newSelected.delete(fileNumber);
    } else {
      newSelected.add(fileNumber);
    }
    setSelectedPatients(newSelected);
  };

  const handleSelectAll = () => {
    if (!calendarData) return;
    
    const filteredPatients = getFilteredPatients();
    const allSelected = filteredPatients.every(p => selectedPatients.has(p.fileNumber));
    
    const newSelected = new Set(selectedPatients);
    filteredPatients.forEach(patient => {
      if (allSelected) {
        newSelected.delete(patient.fileNumber);
      } else {
        newSelected.add(patient.fileNumber);
      }
    });
    
    setSelectedPatients(newSelected);
  };

  const getFilteredPatients = (): PatientAppointment[] => {
    if (!calendarData) return [];
    
    return calendarData.patients.filter(patient => {
      switch (filter) {
        case 'confirmed':
          return patient.confirmed;
        case 'new':
          return patient.isFirstAppointment;
        case 'routine':
          return !patient.isFirstAppointment;
        default:
          return true;
      }
    });
  };

  const handleStartReview = async () => {
    if (!calendarData || selectedPatients.size === 0) return;
    
    setIsProcessing(true);
    
    const selectedPatientList = calendarData.patients.filter(
      patient => selectedPatients.has(patient.fileNumber)
    );
    
    try {
      await onStartReview(selectedPatientList);
    } catch (error) {
      console.error('Failed to start batch review:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAppointmentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'canew':
        return 'bg-blue-100 text-blue-800';
      case 'car20':
      case 'carvi':
        return 'bg-green-100 text-green-800';
      case 'canvi':
        return 'bg-purple-100 text-purple-800';
      case 'phone':
        return 'bg-gray-100 text-gray-800';
      case 'unav':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPatients = getFilteredPatients();
  const selectedCount = selectedPatients.size;
  const estimatedTime = Math.ceil(selectedCount * 2.5); // ~2.5 minutes per patient

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        variants={withReducedMotion(backdropVariants)}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-4"
          variants={withReducedMotion(modalVariants)}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <motion.div
            className="p-6 border-b border-gray-200 bg-gradient-to-br from-purple-50 to-violet-50"
            variants={withReducedMotion(textVariants)}
            initial="hidden"
            animate="visible"
          >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Batch AI Medical Review</h2>
                <p className="text-sm text-gray-600">
                  Select patients for sequential AI review and analysis
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isProcessing}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Calendar Info */}
          {calendarData && (
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="font-medium">{calendarData.appointmentDate}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{calendarData.totalCount} total appointments</span>
              </div>
            </div>
          )}
          </motion.div>

          {/* Content */}
          <motion.div 
            className="flex-1 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
          {isExtracting ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Extracting Patient Data</h3>
                <p className="text-gray-600">Reading appointment information from calendar...</p>
              </div>
            </div>
          ) : extractError ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Extraction Failed</h3>
                <p className="text-red-600 mb-4">{extractError}</p>
                <p className="text-sm text-gray-600">
                  Please ensure you're on the appointment book page and try again.
                </p>
              </div>
            </div>
          ) : !calendarData || calendarData.patients.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients Found</h3>
                <p className="text-gray-600">
                  No appointments with patient data were found on this calendar page.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Filters and Controls */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                      disabled={isProcessing}
                    >
                      <option value="all">All Appointments ({calendarData.patients.length})</option>
                      <option value="confirmed">
                        Confirmed Only ({calendarData.patients.filter(p => p.confirmed).length})
                      </option>
                      <option value="new">
                        New Patients ({calendarData.patients.filter(p => p.isFirstAppointment).length})
                      </option>
                      <option value="routine">
                        Return Visits ({calendarData.patients.filter(p => !p.isFirstAppointment).length})
                      </option>
                    </select>
                  </div>

                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    disabled={isProcessing}
                  >
                    {filteredPatients.every(p => selectedPatients.has(p.fileNumber)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Patient List */}
              <div className="overflow-y-auto max-h-96 p-6">
                <div className="space-y-3">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.fileNumber}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPatients.has(patient.fileNumber)
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePatientToggle(patient.fileNumber)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedPatients.has(patient.fileNumber)}
                            onChange={() => handlePatientToggle(patient.fileNumber)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            disabled={isProcessing}
                          />
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{patient.name}</h4>
                              {patient.isFirstAppointment && (
                                <Star className="w-4 h-4 text-yellow-500" />
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>DOB: {patient.dob}</span>
                              <span>File: {patient.fileNumber}</span>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{patient.appointmentTime}</span>
                              </div>
                            </div>
                            {patient.notes && (
                              <p className="text-xs text-gray-500 mt-1">{patient.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAppointmentTypeColor(patient.appointmentType)}`}>
                            {patient.appointmentType}
                          </span>
                          {patient.confirmed && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          </motion.div>

        {/* Footer */}
        {calendarData && calendarData.patients.length > 0 && !isExtracting && !extractError && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedCount}</span> patient{selectedCount !== 1 ? 's' : ''} selected
                {selectedCount > 0 && (
                  <span className="ml-2">
                    • Estimated time: <span className="font-medium">{estimatedTime} minutes</span>
                  </span>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartReview}
                  disabled={selectedCount === 0 || isProcessing}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Start AI Review</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};