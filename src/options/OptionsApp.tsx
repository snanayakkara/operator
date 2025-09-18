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

import React, { useState, useEffect } from 'react';
import { Settings, ExternalLink, BookOpen, Activity } from 'lucide-react';
import { DashboardSettings } from './components/DashboardSettings';
import { PhrasebookPanel } from './components/PhrasebookPanel';
import { logger } from '@/utils/Logger';

export const OptionsApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'phrasebook'>('dashboard');

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
                    {activeTab === 'dashboard' ? 'Dashboard view — no scrolling, quick insights' : 'Manage custom terminology preferences'}
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

      {/* Navigation Tabs */}
      <div className="settings-container">
        <div className="mb-6">
          <nav className="flex gap-1 p-1 bg-surface-secondary rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-white shadow-sm text-ink-primary'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <Activity className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('phrasebook')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'phrasebook'
                  ? 'bg-white shadow-sm text-ink-primary'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Phrasebook
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="settings-main">
          {activeTab === 'dashboard' && <DashboardSettings />}
          {activeTab === 'phrasebook' && <PhrasebookPanel />}
        </div>
      </div>
    </div>
  );
};
 
