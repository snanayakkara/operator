import React, { useState, useMemo } from 'react';
import { AlertTriangle, MemoryStick, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { ModelLoadingError } from '@/types/errors.types';
import { getModelInfo, formatMemorySize, getModelsForAvailableMemory as _getModelsForAvailableMemory, getRecommendedFallbackModel } from '@/utils/modelInfo';

interface ModelLoadingErrorDialogProps {
  error: ModelLoadingError;
  onRetry: () => void;
  onSwitchModel: (newModelId: string) => void;
  onClose: () => void;
}

export const ModelLoadingErrorDialog: React.FC<ModelLoadingErrorDialogProps> = ({
  error,
  onRetry,
  onSwitchModel,
  onClose
}) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Get metadata for requested model
  const requestedModelInfo = getModelInfo(error.requestedModel);

  // Get suitable fallback models
  const availableModels = useMemo(() => {
    return error.availableModels.filter(modelId => modelId !== error.requestedModel);
  }, [error.availableModels, error.requestedModel]);

  // Recommend a fallback model
  const recommendedModel = useMemo(() => {
    return getRecommendedFallbackModel('', availableModels);
  }, [availableModels]);

  // Pre-select recommended model
  React.useEffect(() => {
    if (recommendedModel && !selectedModel) {
      setSelectedModel(recommendedModel);
    }
  }, [recommendedModel, selectedModel]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSwitchModel = async () => {
    if (!selectedModel) return;

    setIsSwitching(true);
    try {
      await onSwitchModel(selectedModel);
      onClose(); // Close dialog on success
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl m-4">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-rose-50 to-orange-50 border-b-2 border-rose-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Model Loading Failed
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Insufficient System Memory
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-rose-100 rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Problem Explanation */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MemoryStick className="w-5 h-5 text-gray-600" />
              What Happened?
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>Requested Model:</strong>{' '}
                <code className="px-2 py-0.5 bg-white rounded border border-gray-300 text-xs font-mono">
                  {error.requestedModel}
                </code>
              </p>
              <p>
                <strong>Memory Required:</strong>{' '}
                <span className="font-semibold text-rose-600">
                  ~{formatMemorySize(requestedModelInfo.memoryGB)}
                </span>
              </p>
              <p className="bg-rose-50 border border-rose-200 rounded p-3 mt-3">
                <strong className="text-rose-800">LM Studio blocked model loading</strong> to prevent system freeze.
                Your system doesn't have enough free memory to load this model safely.
              </p>
            </div>
          </div>

          {/* Option 1: Free Up Memory */}
          <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 border-b border-blue-200">
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-sm font-bold">
                  1
                </span>
                Option 1: Free Up Memory & Retry
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                Close memory-intensive applications to free up ~{formatMemorySize(requestedModelInfo.memoryGB)}:
              </p>
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Close <strong>Google Chrome</strong> (may free 500+ MB)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Close <strong>Mail</strong> and <strong>Messages</strong> apps</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Close unused <strong>VSCode windows</strong></span>
                </li>
              </ul>
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Retry with {error.requestedModel}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option 2: Switch Model */}
          <div className="border-2 border-emerald-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border-b border-emerald-200">
              <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-emerald-500 text-white rounded-full text-sm font-bold">
                  2
                </span>
                Option 2: Use a Different Model
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                Select a lighter model that fits in available memory:
              </p>

              {availableModels.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <strong>No alternative models available.</strong> Please free up memory to continue.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {availableModels.map(modelId => {
                      const modelInfo = getModelInfo(modelId);
                      const isRecommended = modelId === recommendedModel;
                      const isSelected = modelId === selectedModel;

                      return (
                        <button
                          key={modelId}
                          onClick={() => setSelectedModel(modelId)}
                          className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900 truncate">
                                  {modelInfo.displayName}
                                </span>
                                {isRecommended && (
                                  <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span>
                                  Memory: <strong className="text-emerald-600">{formatMemorySize(modelInfo.memoryGB)}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Speed: <strong>{modelInfo.speed}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Quality: <strong>{modelInfo.quality}</strong>
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {modelInfo.useCases[0]}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleSwitchModel}
                    disabled={!selectedModel || isSwitching}
                    className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isSwitching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Switching Models...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Switch to {selectedModel && getModelInfo(selectedModel).displayName}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Technical Details (Expandable) */}
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700 font-medium">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 font-mono text-xs whitespace-pre-wrap break-all">
              {error.rawErrorMessage}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};
