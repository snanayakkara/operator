/**
 * Server Management Panel Component
 * 
 * Displays real-time status of all three medical AI servers and provides
 * quick access to startup commands for development workflow.
 * 
 * Features:
 * - Real-time server health monitoring (LMStudio, Transcription, DSPy)
 * - Dual model status for LMStudio (reasoning + quick models)
 * - Copy-to-clipboard functionality for startup command
 * - Compact/expanded view modes
 * - Professional status indicators
 */

import React, { useState } from 'react';
import { useModelStatus } from '@/hooks/useModelStatus';
import { Copy, CheckCircle, XCircle, Clock, Server, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import Button, { IconButton } from './buttons/Button';
import { StatusBadge } from './status';
import type { ProcessingState } from '@/utils/stateColors';

interface ServerManagementPanelProps {
  className?: string;
  compactMode?: boolean;
  onServerCommand?: (command: string) => void;
}

interface ServerStatusIndicatorProps {
  name: string;
  url: string;
  isHealthy: boolean;
  details?: string[];
  icon?: React.ReactNode;
}

/**
 * Maps server health status to ProcessingState for StatusBadge
 */
const mapServerHealthToState = (isHealthy: boolean): ProcessingState => {
  return isHealthy ? 'completed' : 'error';
};

const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({
  name,
  url,
  isHealthy,
  details = [],
  icon
}) => {
  const statusIcon = isHealthy ? (
    <CheckCircle className="w-4 h-4" />
  ) : (
    <XCircle className="w-4 h-4" />
  );

  const statusColor = isHealthy
    ? 'bg-green-50 border-green-200'
    : 'bg-red-50 border-red-200';

  return (
    <div className={`flex items-start space-x-3 p-3 rounded-lg border ${statusColor}`}>
      <div className="flex-shrink-0 mt-0.5">
        {icon || statusIcon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium truncate text-gray-900">{name}</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">{url.replace('http://localhost:', ':')}</span>
            <StatusBadge
              state={mapServerHealthToState(isHealthy)}
              size="sm"
              label={isHealthy ? 'Running' : 'Offline'}
            />
          </div>
        </div>
        {details.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {details.map((detail, index) => (
              <p key={index} className="text-xs text-gray-600">
                {detail}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ServerManagementPanel: React.FC<ServerManagementPanelProps> = ({
  className = '',
  compactMode = false,
  onServerCommand
}) => {
  const { data: modelStatus, isLoading, error } = useModelStatus();
  const [isExpanded, setIsExpanded] = useState(!compactMode);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText('./dev');
      setCopySuccess(true);
      
      // Reset success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
      
      if (onServerCommand) {
        onServerCommand('./dev');
      }
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
    }
  };

  // Calculate overall server health
  const getOverallHealth = () => {
    if (!modelStatus) return { healthy: 0, total: 3, allHealthy: false };
    
    const lmstudioHealthy = modelStatus.isConnected;
    const whisperHealthy = modelStatus.whisperServer?.running || false;
    const dspyHealthy = modelStatus.dspyServer?.running || false;
    
    const healthyCount = [lmstudioHealthy, whisperHealthy, dspyHealthy].filter(Boolean).length;
    
    return {
      healthy: healthyCount,
      total: 3,
      allHealthy: healthyCount === 3
    };
  };

  const health = getOverallHealth();

  // Compact mode display
  if (compactMode && !isExpanded) {
    const statusColor = health.allHealthy ? 'text-green-600' : 'text-orange-600';
    const statusIcon = health.allHealthy ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <Clock className="w-4 h-4 text-orange-600" />
    );

    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-3 ${className}`}>
        <Button
          onClick={() => setIsExpanded(true)}
          variant="ghost"
          className="w-full text-left justify-between"
        >
          <div className="flex items-center space-x-2">
            {statusIcon}
            <span className={`text-sm font-medium ${statusColor}`}>
              Servers: {health.healthy}/{health.total}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-400 animate-spin" />
          <span className="text-sm text-gray-600">Checking server status...</span>
        </div>
      </div>
    );
  }

  if (error || !modelStatus) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-800">Unable to check server status</span>
        </div>
      </div>
    );
  }

  // Prepare server details
  const lmstudioDetails = [];
  if (modelStatus.processorModel) {
    lmstudioDetails.push(`Processor: ${modelStatus.processorModel}`);
  }

  const whisperDetails = [];
  if (modelStatus.whisperServer?.model) {
    whisperDetails.push(`Model: ${modelStatus.whisperServer.model}`);
  }
  if (modelStatus.whisperServer?.error) {
    whisperDetails.push(`Error: ${modelStatus.whisperServer.error}`);
  }

  const dspyDetails = [];
  if (modelStatus.dspyServer?.stats) {
    const { requests_processed, errors_encountered } = modelStatus.dspyServer.stats;
    dspyDetails.push(`Requests: ${requests_processed}, Errors: ${errors_encountered}`);
  }
  if (modelStatus.dspyServer?.error) {
    dspyDetails.push(`Error: ${modelStatus.dspyServer.error}`);
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Development Servers
          </h3>
          <StatusBadge
            state={health.allHealthy ? 'completed' : 'needs_review'}
            size="sm"
            label={`${health.healthy}/${health.total} Running`}
          />
        </div>

        {compactMode && (
          <IconButton
            onClick={() => setIsExpanded(false)}
            icon={<ChevronUp />}
            variant="ghost"
            size="sm"
            aria-label="Collapse server panel"
            className="text-gray-400 hover:text-gray-600"
          />
        )}
      </div>

      {/* Server Status List */}
      <div className="p-4 space-y-3">
        <ServerStatusIndicator
          name="LMStudio Server"
          url="http://localhost:1234"
          isHealthy={modelStatus.isConnected}
          details={lmstudioDetails}
          icon={<Server className="w-4 h-4 text-indigo-600" />}
        />
        
        <ServerStatusIndicator
          name="Transcription Server"
          url="http://localhost:8001"
          isHealthy={modelStatus.whisperServer?.running || false}
          details={whisperDetails}
        />
        
        <ServerStatusIndicator
          name="DSPy Server"
          url="http://localhost:8002"
          isHealthy={modelStatus.dspyServer?.running || false}
          details={dspyDetails}
        />
      </div>

      {/* Quick Start Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Quick Start</h4>
          <Terminal className="w-4 h-4 text-gray-400" />
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-2">
            <code className="text-sm font-mono text-gray-900">./dev</code>
          </div>

          <Button
            onClick={handleCopyCommand}
            variant={copySuccess ? 'success' : 'outline'}
            size="sm"
            startIcon={copySuccess ? <CheckCircle /> : <Copy />}
            className={copySuccess ? 'bg-green-50 border-green-300 text-green-700' : ''}
          >
            {copySuccess ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        
        <p className="mt-2 text-xs text-gray-600">
          Starts all servers with dual model loading (MedGemma-27b + Gemma-3n-e4b)
        </p>
      </div>

      {/* Additional Info for Unhealthy State */}
      {!health.allHealthy && (
        <div className="border-t border-orange-200 bg-orange-50 p-3">
          <div className="flex items-start space-x-2">
            <XCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-orange-800">
                Some services are not running
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Run <code className="font-mono bg-orange-100 px-1 rounded">./dev</code> to start all required servers automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
