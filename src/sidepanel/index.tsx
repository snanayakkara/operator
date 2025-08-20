import React from 'react';
import { createRoot } from 'react-dom/client';
import OptimizedApp from './OptimizedApp';
import './styles/globals.css';

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
              The Reflow Medical Assistant encountered an error.
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
function initializeApp() {
  console.log('🏥 Initializing Reflow Medical Assistant...', new Date().toISOString());
  console.log('🔧 Extension context check:', typeof chrome !== 'undefined' && chrome.runtime);
  
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found!');
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 1rem; backdrop-filter: blur(10px);">
          <h1 style="color: white; margin-bottom: 1rem;">Mount Error</h1>
          <p style="color: rgba(255,255,255,0.8);">Could not find root element</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
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
      <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 1rem; backdrop-filter: blur(10px);">
          <h1 style="color: white; margin-bottom: 1rem;">Render Error</h1>
          <p style="color: rgba(255,255,255,0.8);">${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
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
  (window as any).reflowDebug = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    chromeAvailable: typeof chrome !== 'undefined',
    extensionId: chrome?.runtime?.id || 'unknown'
  };
  console.log('🔧 Debug info:', (window as any).reflowDebug);
}