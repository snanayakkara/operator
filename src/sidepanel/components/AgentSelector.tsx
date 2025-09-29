import React, { useState } from 'react';
import { ChevronDown, Brain, Heart, Eye, FileText, Stethoscope, Activity, ClipboardList } from 'lucide-react';
import { useDropdownPosition } from '../hooks/useDropdownPosition';
import { DropdownPortal } from './DropdownPortal';
import type { AgentType } from '@/types/medical.types';

interface AgentSelectorProps {
  selectedAgent: AgentType | null;
  onAgentSelect: (agentType: AgentType) => void;
  disabled?: boolean;
}

const AGENT_CONFIGS = {
  'tavi': {
    name: 'TAVI',
    fullName: 'Transcatheter Aortic Valve Implantation',
    icon: Heart,
    color: 'text-red-400',
    description: 'Aortic valve replacement procedures'
  },
  'pci': {
    name: 'PCI',
    fullName: 'Percutaneous Coronary Intervention',
    icon: Activity,
    color: 'text-blue-400',
    description: 'Coronary angioplasty and stenting'
  },
  'angiogram': {
    name: 'Angiogram',
    fullName: 'Cardiac Catheterization',
    icon: Eye,
    color: 'text-purple-400',
    description: 'Diagnostic cardiac imaging'
  },
  'quick-letter': {
    name: 'Quick Letter',
    fullName: 'Medical Correspondence',
    icon: FileText,
    color: 'text-green-400',
    description: 'Brief medical notes and letters'
  },
  'tavi-workup': {
    name: 'TAVI Workup',
    fullName: 'TAVI Workup Dictation',
    icon: ClipboardList,
    color: 'text-red-400',
    description: 'Pre-procedural workup summary'
  },
  'consultation': {
    name: 'Consultation',
    fullName: 'Medical Consultation',
    icon: Stethoscope,
    color: 'text-indigo-400',
    description: 'Comprehensive patient assessments'
  }
} as const;

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgent,
  onAgentSelect,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const { triggerRef, position } = useDropdownPosition({
    isOpen,
    alignment: 'left',
    offset: { x: 0, y: 8 },
    maxHeight: 320
  });

  const handleAgentSelect = (agentType: AgentType) => {
    console.log('🔬 AgentSelector.handleAgentSelect called with:', agentType);
    onAgentSelect(agentType);
    setIsOpen(false);
  };

  const selectedConfig = selectedAgent && selectedAgent in AGENT_CONFIGS ? AGENT_CONFIGS[selectedAgent as keyof typeof AGENT_CONFIGS] : null;

  const agents = Object.entries(AGENT_CONFIGS) as [AgentType, typeof AGENT_CONFIGS[keyof typeof AGENT_CONFIGS]][];

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-gray-900 font-medium text-sm mb-3">Medical Agent</h3>
      
      <div className="relative dropdown-reset-context">
        {/* Selected Agent Display / Dropdown Trigger */}
        <button
          ref={triggerRef}
          data-dropdown-trigger
          onClick={() => {
            console.log('🔬 AgentSelector dropdown clicked, disabled:', disabled, 'isOpen:', isOpen);
            if (!disabled) {
              setIsOpen(!isOpen);
            }
          }}
          disabled={disabled}
          className={`
            w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 p-3 rounded-lg flex items-center justify-between transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
          `}
        >
          {selectedConfig ? (
            <div className="flex items-center space-x-3">
              <selectedConfig.icon className={`w-5 h-5 ${selectedConfig.color}`} />
              <div className="text-left">
                <div className="text-gray-900 font-medium text-sm">
                  {selectedConfig.name}
                </div>
                <div className="text-gray-600 text-xs">
                  {selectedConfig.description}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Brain className="w-5 h-5 text-gray-500" />
              <div className="text-left">
                <div className="text-gray-600 text-sm">
                  Auto-detected agent
                </div>
                <div className="text-gray-500 text-xs">
                  Agent will be selected automatically
                </div>
              </div>
            </div>
          )}
          
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown Menu - Portal Based */}
        <DropdownPortal
          isOpen={isOpen}
          onClickOutside={() => setIsOpen(false)}
        >
          <div 
            data-dropdown-menu
            className="glass rounded-lg border border-gray-200 overflow-hidden overflow-y-auto shadow-2xl"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              right: position.right,
              maxHeight: position.maxHeight,
              width: triggerRef.current?.offsetWidth || 280,
              zIndex: 999999
            }}
          >
            {/* Auto Detection Option */}
            <button
              onClick={() => handleAgentSelect(null as any)}
              className="w-full p-3 hover:bg-gray-50 flex items-center space-x-3 transition-colors border-b border-gray-100"
            >
              <Brain className="w-5 h-5 text-gray-500" />
              <div className="text-left">
                <div className="text-gray-900 font-medium text-sm">
                  Auto-detect
                </div>
                <div className="text-gray-600 text-xs">
                  Let AI choose the best agent
                </div>
              </div>
            </button>

            {/* Agent Options */}
            {agents.map(([agentType, config]) => (
              <button
                key={agentType}
                onClick={() => handleAgentSelect(agentType)}
                className={`
                  w-full p-3 hover:bg-gray-50 flex items-center space-x-3 transition-colors
                  ${selectedAgent === agentType ? 'bg-gray-50' : ''}
                `}
              >
                <config.icon className={`w-5 h-5 ${config.color}`} />
                <div className="text-left">
                  <div className="text-gray-900 font-medium text-sm">
                    {config.name}
                  </div>
                  <div className="text-gray-600 text-xs">
                    {config.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DropdownPortal>
      </div>

      {/* Agent Info */}
      {selectedConfig && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-gray-800 text-xs leading-relaxed">
            <strong>{selectedConfig.fullName}</strong>
            <br />
            Specialized for {selectedConfig.description.toLowerCase()}
          </div>
        </div>
      )}

    </div>
  );
};
