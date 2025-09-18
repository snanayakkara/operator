import React from 'react';
import { createRoot } from 'react-dom/client';
import { OptionsApp } from './OptionsApp';
import { QueryProvider } from '@/providers/QueryProvider';
import '../sidepanel/styles/globals.css';

// Initialize React app for options page
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <QueryProvider>
      <OptionsApp />
    </QueryProvider>
  );
}
