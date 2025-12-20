import React, { useState, useMemo } from 'react';
import { Plus, DollarSign, ChevronDown, Search, Check, X, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useRounds } from '@/contexts/RoundsContext';
import { RoundsPatient, BillingEntry, BillingStatus } from '@/types/rounds.types';
import { MBS_CODES, searchMBSCodes, MBSCode } from '@/data/mbsCodes';
import { generateRoundsId, isoNow } from '@/utils/rounds';
import Button from '../buttons/Button';

interface BillingSectionProps {
  patient: RoundsPatient;
}

const STATUS_CONFIG: Record<BillingStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  entered: { label: 'Entered', color: 'text-green-600 bg-green-50 border-green-200', icon: Check },
  rejected: { label: 'Rejected', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle },
};

export const BillingSection: React.FC<BillingSectionProps> = ({ patient }) => {
  const { addBillingEntry, updateBillingEntry, deleteBillingEntry, markBillingEntered, notionAvailable } = useRounds();
  
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  
  // Custom entry form
  const [customCode, setCustomCode] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customFee, setCustomFee] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const billingEntries = patient.billingEntries || [];
  const pendingCount = billingEntries.filter(e => e.status === 'pending').length;
  const enteredCount = billingEntries.filter(e => e.status === 'entered').length;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return MBS_CODES.slice(0, 10);
    return searchMBSCodes(searchQuery);
  }, [searchQuery]);

  const resetForm = () => {
    setSearchQuery('');
    setCustomCode('');
    setCustomDescription('');
    setCustomFee('');
    setServiceDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setCustomMode(false);
    setShowSearchResults(false);
    setShowAddForm(false);
  };

  const handleSelectMBSCode = (mbsCode: MBSCode) => {
    const entry: Omit<BillingEntry, 'id' | 'createdAt'> = {
      mbsCode: mbsCode.code,
      description: mbsCode.description,
      fee: mbsCode.fee,
      serviceDate,
      status: 'pending',
      notes: notes.trim() || undefined,
    };
    addBillingEntry(patient.id, entry);
    resetForm();
  };

  const handleAddCustomEntry = () => {
    if (!customCode.trim() || !customDescription.trim()) return;
    
    const entry: Omit<BillingEntry, 'id' | 'createdAt'> = {
      mbsCode: customCode.trim(),
      description: customDescription.trim(),
      fee: customFee ? parseFloat(customFee) : undefined,
      serviceDate,
      status: 'pending',
      notes: notes.trim() || undefined,
    };
    addBillingEntry(patient.id, entry);
    resetForm();
  };

  const handleMarkEntered = async (entryId: string) => {
    await markBillingEntered(patient.id, entryId);
  };

  const handleDelete = (entryId: string) => {
    if (window.confirm('Delete this billing entry?')) {
      deleteBillingEntry(patient.id, entryId);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return `$${amount.toFixed(2)}`;
  };

  const notionPageUrl = (pageId: string) => `https://www.notion.so/${pageId.replace(/-/g, '')}`;

  const totalPending = billingEntries
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + (e.fee || 0), 0);

  return (
    <div className="rounded-xl border border-blue-500 p-4 bg-white shadow-sm">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-900">Billing</h4>
          {billingEntries.length > 0 && (
            <span className="text-xs text-gray-500">
              ({pendingCount} pending, {enteredCount} entered)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notionAvailable && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              Notion
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Summary */}
          {billingEntries.length > 0 && totalPending > 0 && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              Pending total: <span className="font-medium">{formatCurrency(totalPending)}</span>
            </div>
          )}

          {/* Billing entries list */}
          <div className="space-y-2">
            {billingEntries.map(entry => {
              const StatusIcon = STATUS_CONFIG[entry.status].icon;
              return (
                <div
                  key={entry.id}
                  className={`border rounded-lg px-3 py-2 ${STATUS_CONFIG[entry.status].color}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{entry.mbsCode}</span>
                        <StatusIcon className="w-3 h-3" />
                      </div>
                      <p className="text-xs text-gray-700 truncate">{entry.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                        <span>{entry.serviceDate}</span>
                        {entry.fee && <span>{formatCurrency(entry.fee)}</span>}
                        {entry.notes && <span className="italic truncate">{entry.notes}</span>}
                        {notionAvailable && entry.status === 'entered' && entry.notionId && (
                          <a
                            className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-800 hover:underline"
                            href={notionPageUrl(entry.notionId)}
                            target="_blank"
                            rel="noreferrer noopener"
                            title="Open in Notion"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Notion synced <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {notionAvailable && entry.status === 'entered' && !entry.notionId && entry.notionSyncError && (
                          <span className="text-red-600" title={entry.notionSyncError}>Notion sync failed</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {entry.status === 'pending' && (
                        <button
                          onClick={() => handleMarkEntered(entry.id)}
                          className="p-1 rounded hover:bg-green-100 text-green-600"
                          title="Mark as entered"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1 rounded hover:bg-red-100 text-red-400"
                        title="Delete"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add form */}
          {showAddForm ? (
            <div className="border border-dashed border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase text-gray-500">Add billing item</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomMode(false)}
                    className={`text-[10px] px-2 py-0.5 rounded ${!customMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    MBS Search
                  </button>
                  <button
                    onClick={() => setCustomMode(true)}
                    className={`text-[10px] px-2 py-0.5 rounded ${customMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {!customMode ? (
                // MBS Search mode
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className="w-full rounded-md border px-8 py-2 text-sm"
                      placeholder="Search MBS code or description..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearchResults(true);
                      }}
                      onFocus={() => setShowSearchResults(true)}
                    />
                  </div>
                  
                  {showSearchResults && (
                    <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                      {searchResults.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          No codes found. Try custom entry.
                        </div>
                      ) : (
                        searchResults.map(code => (
                          <button
                            key={code.code}
                            onClick={() => handleSelectMBSCode(code)}
                            className="w-full text-left p-2 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-medium text-blue-600">{code.code}</span>
                              {code.fee && (
                                <span className="text-xs text-gray-500">{formatCurrency(code.fee)}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate">{code.description}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">Service Date</label>
                      <input
                        type="date"
                        className="w-full rounded-md border px-2 py-1 text-sm"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Notes (optional)</label>
                      <input
                        className="w-full rounded-md border px-2 py-1 text-sm"
                        placeholder="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Custom entry mode
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">Code</label>
                      <input
                        className="w-full rounded-md border px-2 py-1 text-sm"
                        placeholder="e.g., 23010"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Fee (optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border px-2 py-1 text-sm"
                        placeholder="0.00"
                        value={customFee}
                        onChange={(e) => setCustomFee(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Description</label>
                    <input
                      className="w-full rounded-md border px-2 py-1 text-sm"
                      placeholder="Description"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">Service Date</label>
                      <input
                        type="date"
                        className="w-full rounded-md border px-2 py-1 text-sm"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Notes (optional)</label>
                      <input
                        className="w-full rounded-md border px-2 py-1 text-sm"
                        placeholder="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button size="xs" variant="ghost" onClick={resetForm}>Cancel</Button>
                    <Button
                      size="xs"
                      onClick={handleAddCustomEntry}
                      disabled={!customCode.trim() || !customDescription.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {!customMode && (
                <div className="flex justify-end">
                  <Button size="xs" variant="ghost" onClick={resetForm}>Cancel</Button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-1 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add billing item
            </button>
          )}

          {billingEntries.length === 0 && !showAddForm && (
            <p className="text-sm text-gray-500 text-center py-2">No billing items yet.</p>
          )}
        </div>
      )}
    </div>
  );
};
