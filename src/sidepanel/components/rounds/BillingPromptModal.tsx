import React, { useState, useMemo } from 'react';
import { DollarSign, Search, X, Check, Clock, ChevronRight } from 'lucide-react';
import { RoundsPatient, BillingEntry } from '@/types/rounds.types';
import { MBS_CODES, searchMBSCodes, MBSCode } from '@/data/mbsCodes';
import { useRounds } from '@/contexts/RoundsContext';
import Button from '../buttons/Button';

interface BillingPromptModalProps {
  patient: RoundsPatient;
  serviceDate: string; // YYYY-MM-DD format
  onClose: () => void;
  onComplete: () => void;
}

// Get the most common codes for quick selection
const QUICK_CODES = MBS_CODES
  .filter(c => c.common && c.common <= 15)
  .sort((a, b) => (a.common || 999) - (b.common || 999))
  .slice(0, 8);

export const BillingPromptModal: React.FC<BillingPromptModalProps> = ({
  patient,
  serviceDate,
  onClose,
  onComplete
}) => {
  const { addBillingEntry } = useRounds();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<MBSCode[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchMBSCodes(searchQuery).slice(0, 10);
  }, [searchQuery]);

  const handleSelectCode = (code: MBSCode) => {
    if (selectedCodes.find(c => c.code === code.code)) {
      setSelectedCodes(prev => prev.filter(c => c.code !== code.code));
    } else {
      setSelectedCodes(prev => [...prev, code]);
    }
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleRemoveCode = (code: string) => {
    setSelectedCodes(prev => prev.filter(c => c.code !== code));
  };

  const handleConfirm = async () => {
    // Add all selected billing entries
    for (const code of selectedCodes) {
      const entry: Omit<BillingEntry, 'id' | 'createdAt'> = {
        mbsCode: code.code,
        description: code.description,
        fee: code.fee,
        serviceDate,
        status: 'pending',
      };
      await addBillingEntry(patient.id, entry);
    }
    onComplete();
  };

  const handleSkip = () => {
    onComplete();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '';
    return `$${amount.toFixed(2)}`;
  };

  const totalFee = selectedCodes.reduce((sum, c) => sum + (c.fee || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Bill for today's round?</h3>
                <p className="text-xs text-gray-500">{patient.name} • {serviceDate}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Select Grid */}
        <div className="p-4 space-y-3">
          <div className="text-xs uppercase text-gray-500 font-medium">Common Codes</div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_CODES.map(code => {
              const isSelected = selectedCodes.find(c => c.code === code.code);
              return (
                <button
                  key={code.code}
                  onClick={() => handleSelectCode(code)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                        {code.code}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{code.description}</p>
                  </div>
                  {code.fee && (
                    <span className="text-xs text-gray-400 ml-2">{formatCurrency(code.fee)}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search for more */}
          {showSearch ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-9 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Search by code or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                  {searchResults.map(code => {
                    const isSelected = selectedCodes.find(c => c.code === code.code);
                    return (
                      <button
                        key={code.code}
                        onClick={() => handleSelectCode(code)}
                        className={`w-full text-left p-2 hover:bg-gray-50 flex items-center justify-between ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div>
                          <span className="font-mono text-sm font-medium text-blue-600">{code.code}</span>
                          <span className="text-xs text-gray-500 ml-2">{code.description}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-dashed border-gray-300 transition-colors"
            >
              <Search className="w-4 h-4" />
              Search for more codes
            </button>
          )}

          {/* Selected Summary */}
          {selectedCodes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 uppercase font-medium">Selected ({selectedCodes.length})</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalFee)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedCodes.map(code => (
                  <span
                    key={code.code}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-full text-xs"
                  >
                    <span className="font-mono font-medium">{code.code}</span>
                    <button
                      onClick={() => handleRemoveCode(code.code)}
                      className="p-0.5 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Clock className="w-4 h-4" />
            Skip for now
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedCodes.length === 0}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              Add {selectedCodes.length > 0 ? `${selectedCodes.length} item${selectedCodes.length > 1 ? 's' : ''}` : 'billing'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
