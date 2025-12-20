import React from 'react';
import { createRoot } from 'react-dom/client';
import OptimizedApp from './OptimizedApp';
import './styles/globals.css';
import { installClinicalSyncWriteGuard, migrateClinicalStateFromSyncToLocal } from '@/storage/clinicalStorage';

// Hard-stop default browser handling of OS file drops in the side panel
// Attach ASAP at module load with capture + non-passive listeners
const preventDropNavigation = () => {
  const prevent = (e: Event) => {
    // Only prevent default; do not stop propagation so drop zones still receive events
    e.preventDefault();
  };

  // Capture on all major roots
  window.addEventListener('dragover', prevent, { capture: true });
  window.addEventListener('drop', prevent, { capture: true });
  document.addEventListener('dragover', prevent, { capture: true });
  document.addEventListener('drop', prevent, { capture: true });
  document.documentElement?.addEventListener?.('dragover', prevent as any, { capture: true } as any);
  document.documentElement?.addEventListener?.('drop', prevent as any, { capture: true } as any);
  document.body?.addEventListener?.('dragover', prevent as any, { capture: true } as any);
  document.body?.addEventListener?.('drop', prevent as any, { capture: true } as any);
};

preventDropNavigation();

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 p-4 flex items-center justify-center">
          <div className="glass rounded-2xl p-6 max-w-md text-center">
            <h1 className="text-white text-xl font-bold mb-4">
              Extension Error
            </h1>
            <p className="text-white/80 mb-4">
              The Operator Chrome Extension encountered an error.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reload Extension
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-white/60 cursor-pointer text-sm">
                  Error Details
                </summary>
                <pre className="text-xs text-white/50 mt-2 p-2 bg-black/20 rounded">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error in sidepanel:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in sidepanel:', event.reason);
});

// Initialize React app
async function initializeApp() {
  installClinicalSyncWriteGuard();
  await migrateClinicalStateFromSyncToLocal();

  console.log('🏥 Initializing Operator Chrome Extension...', new Date().toISOString());
  console.log('🔧 Extension context check:', typeof chrome !== 'undefined' && chrome.runtime);
  
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found!');
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 2rem; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h1 style="color: #1a1a1a; margin-bottom: 1rem;">Mount Error</h1>
          <p style="color: #525252;">Could not find root element</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Check if we're in a Chrome extension context
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('⚠️ Chrome extension APIs not available');
  } else {
    console.log('✅ Chrome extension context detected');
  }

  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <OptimizedApp />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('✅ React app rendered successfully');
  } catch (error) {
    console.error('❌ Failed to render React app:', error);
    // Fallback UI
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 2rem; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h1 style="color: #1a1a1a; margin-bottom: 1rem;">Render Error</h1>
          <p style="color: #525252;">${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload
          </button>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  console.log('⏳ Waiting for DOM to load...');
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  console.log('✅ DOM already loaded, initializing immediately');
  initializeApp();
}

// Add debugging info to window for testing
if (typeof window !== 'undefined') {
  (window as any).operatorDebug = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    chromeAvailable: typeof chrome !== 'undefined',
    extensionId: chrome?.runtime?.id || 'unknown'
  };
  console.log('🔧 Debug info:', (window as any).operatorDebug);
}
