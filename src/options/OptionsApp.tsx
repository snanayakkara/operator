/**
 * OptionsApp - Main full-page settings application
 * 
 * Provides a comprehensive settings interface with:
 * - Sidebar navigation for different settings sections
 * - Full-page layout optimized for desktop viewing
 * - Enhanced transcription management with expanded space
 * - Professional monochrome design system
 * - Responsive design for different screen sizes
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Zap, 
  Moon, 
  CheckCircle, 
  FileText, 
  Server, 
  Mic,
  User,
  BarChart3,
  HelpCircle,
  ExternalLink,
  Clock,
  AlertCircle
} from 'lucide-react';
import { FullPageOptimizationPanel } from './components/FullPageOptimizationPanel';
import { FullPageCorrectionsViewer } from './components/FullPageCorrectionsViewer';
import { logger } from '@/utils/Logger';

type SettingsSection = 
  | 'overview' 
  | 'transcriptions' 
  | 'optimization' 
  | 'services' 
  | 'performance' 
  | 'help';

interface SettingsSectionConfig {
  id: SettingsSection;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'Extension status and quick actions',
    icon: BarChart3
  },
  {
    id: 'transcriptions',
    title: 'Transcriptions',
    description: 'View and manage ASR corrections',
    icon: FileText
  },
  {
    id: 'optimization',
    title: 'Optimization',
    description: 'ASR and report quality improvements',
    icon: Zap
  },
  {
    id: 'services',
    title: 'AI Services',
    description: 'LMStudio and Whisper server status',
    icon: Server
  },
  {
    id: 'performance',
    title: 'Performance',
    description: 'Metrics and usage analytics',
    icon: BarChart3
  },
  {
    id: 'help',
    title: 'Help & Support',
    description: 'Documentation and troubleshooting',
    icon: HelpCircle
  }
];

export const OptionsApp: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize options app
  useEffect(() => {
    const initialize = async () => {
      try {
        // Log options page opening
        logger.info('Options page opened', {
          component: 'OptionsApp',
          timestamp: Date.now()
        });

        // Add any initialization logic here
        // (service status checks, load user preferences, etc.)
        
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading
        
      } catch (error) {
        logger.error('Failed to initialize options page', {
          component: 'OptionsApp',
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading Operator Settings...</div>
        </div>
      </div>
    );
  }

  // Render main content based on active section
  const renderMainContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'transcriptions':
        return <FullPageCorrectionsViewer />;
      case 'optimization':
        return <FullPageOptimizationPanel />;
      case 'services':
        return <ServicesSection />;
      case 'performance':
        return <PerformanceSection />;
      case 'help':
        return <HelpSection />;
      default:
        return <OverviewSection />;
    }
  };

  const activeConfig = SETTINGS_SECTIONS.find(section => section.id === activeSection);

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-container">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Settings className="w-8 h-8 text-ink-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-ink-primary tracking-tight">
                    Operator Settings
                  </h1>
                  <p className="text-ink-secondary mt-1">
                    Configure your medical AI assistant
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => window.close()}
              className="mono-button-secondary flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="settings-container">
        <div className="settings-content">
          {/* Sidebar Navigation */}
          <div className="settings-nav">
            <h2 className="text-lg font-semibold text-ink-primary mb-6">Settings</h2>
            
            <nav className="space-y-2">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                      isActive
                        ? 'bg-surface-tertiary border-2 border-line-secondary text-ink-primary'
                        : 'hover:bg-surface-secondary text-ink-secondary hover:text-ink-primary border-2 border-transparent'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-accent-info' : 'text-ink-tertiary'}`} />
                    <div>
                      <div className={`font-medium text-sm ${isActive ? 'text-ink-primary' : 'text-ink-secondary'}`}>
                        {section.title}
                      </div>
                      <div className={`text-xs ${isActive ? 'text-ink-secondary' : 'text-ink-tertiary'}`}>
                        {section.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="settings-main">
            <div className="mb-8">
              {activeConfig && (
                <div className="flex items-center space-x-3 mb-2">
                  <activeConfig.icon className="w-6 h-6 text-accent-info" />
                  <h2 className="text-2xl font-semibold text-ink-primary">
                    {activeConfig.title}
                  </h2>
                </div>
              )}
              {activeConfig && (
                <p className="text-ink-secondary">
                  {activeConfig.description}
                </p>
              )}
            </div>

            <div className="settings-content-area">
              {renderMainContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Overview Section Component
const OverviewSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Extension Status Card */}
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-6 h-6 text-accent-success" />
            <h3 className="font-semibold text-ink-primary">Extension Status</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-secondary">Version:</span>
              <span className="text-ink-primary font-mono">3.2.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Status:</span>
              <span className="text-accent-success">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Agents:</span>
              <span className="text-ink-primary">11 Available</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="w-6 h-6 text-accent-info" />
            <h3 className="font-semibold text-ink-primary">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full mono-button-secondary text-left">
              Clear Storage Cache
            </button>
            <button className="w-full mono-button-secondary text-left">
              Export Settings
            </button>
            <button className="w-full mono-button-secondary text-left">
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Usage Stats Card */}
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-6 h-6 text-accent-info" />
            <h3 className="font-semibold text-ink-primary">Usage Stats</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-secondary">Sessions Today:</span>
              <span className="text-ink-primary">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Total Reports:</span>
              <span className="text-ink-primary">247</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Corrections:</span>
              <span className="text-ink-primary">89</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
        <h3 className="font-semibold text-ink-primary mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-surface-primary rounded-lg">
            <Clock className="w-4 h-4 text-ink-tertiary" />
            <div>
              <div className="text-sm text-ink-primary">Quick Letter completed</div>
              <div className="text-xs text-ink-secondary">2 minutes ago</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-surface-primary rounded-lg">
            <Mic className="w-4 h-4 text-ink-tertiary" />
            <div>
              <div className="text-sm text-ink-primary">TAVI procedure transcribed</div>
              <div className="text-xs text-ink-secondary">15 minutes ago</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-surface-primary rounded-lg">
            <User className="w-4 h-4 text-ink-tertiary" />
            <div>
              <div className="text-sm text-ink-primary">Patient session started</div>
              <div className="text-xs text-ink-secondary">1 hour ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder sections (to be implemented)
const ServicesSection: React.FC = () => (
  <div className="text-center py-12">
    <Server className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
    <h3 className="text-lg font-medium text-ink-primary mb-2">AI Services</h3>
    <p className="text-ink-secondary">Service status and configuration coming soon.</p>
  </div>
);

const PerformanceSection: React.FC = () => (
  <div className="text-center py-12">
    <BarChart3 className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
    <h3 className="text-lg font-medium text-ink-primary mb-2">Performance Metrics</h3>
    <p className="text-ink-secondary">Detailed analytics and metrics coming soon.</p>
  </div>
);

const HelpSection: React.FC = () => (
  <div className="space-y-8">
    <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
      <h3 className="font-semibold text-ink-primary mb-4">Documentation</h3>
      <div className="space-y-3">
        <a 
          href="#" 
          className="flex items-center justify-between p-3 bg-surface-primary rounded-lg hover:bg-surface-tertiary transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-ink-primary">User Guide</div>
            <div className="text-xs text-ink-secondary">Complete setup and usage instructions</div>
          </div>
          <ExternalLink className="w-4 h-4 text-ink-tertiary" />
        </a>
        <a 
          href="#" 
          className="flex items-center justify-between p-3 bg-surface-primary rounded-lg hover:bg-surface-tertiary transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-ink-primary">Troubleshooting</div>
            <div className="text-xs text-ink-secondary">Common issues and solutions</div>
          </div>
          <ExternalLink className="w-4 h-4 text-ink-tertiary" />
        </a>
      </div>
    </div>

    <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
      <h3 className="font-semibold text-ink-primary mb-4">Support</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-secondary">Extension Version:</span>
          <span className="text-ink-primary font-mono">3.2.0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-secondary">Chrome Version:</span>
          <span className="text-ink-primary font-mono">{navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-secondary">Platform:</span>
          <span className="text-ink-primary">{navigator.platform}</span>
        </div>
      </div>
    </div>
  </div>
);