import React from 'react';
import { createRoot } from 'react-dom/client';
import { CanvasApp } from './CanvasApp';
import '@/sidepanel/styles/globals.css';

// Prevent browser navigation on file drop
const preventDropNavigation = () => {
  const prevent = (e: Event) => {
    e.preventDefault();
  };
  window.addEventListener('dragover', prevent, { capture: true });
  window.addEventListener('drop', prevent, { capture: true });
  document.addEventListener('dragover', prevent, { capture: true });
  document.addEventListener('drop', prevent, { capture: true });
};

preventDropNavigation();

const boot = () => {
  console.log('📸 Canvas page booting (React).');
  const root = document.getElementById('root');
  if (!root) {
    console.error('❌ Canvas root element not found.');
    return;
  }

  createRoot(root).render(
    <React.StrictMode>
      <CanvasApp />
    </React.StrictMode>
  );
};

boot();
