/**
 * Presentation Page Entry Point
 * 
 * React entry point for the TAVI workup presentation view.
 * Opens in a new Chrome tab via chrome-extension:// URL.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { PresentationPage } from './PresentationPage';
import './styles/presentation.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <PresentationPage />
    </React.StrictMode>
  );
}
