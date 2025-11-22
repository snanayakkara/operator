import React from 'react';
import { createRoot } from 'react-dom/client';
import { ScreenshotAnnotationModal } from '@/sidepanel/components/ScreenshotAnnotationModal';
import type { AnnotatedScreenshot } from '@/services/ScreenshotCombiner';
import '@/sidepanel/styles/globals.css';

const params = new URLSearchParams(window.location.search);
const slotParam = Number(params.get('slot') ?? '0');
const initialSlot = Number.isFinite(slotParam) && slotParam >= 0 && slotParam <= 3 ? slotParam : 0;

const handleSubmit = (screenshots: (AnnotatedScreenshot | null)[]) => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    const serialized = screenshots.map((s, index) =>
      s
        ? {
            index,
            dataUrl: s.dataUrl,
            width: s.width,
            height: s.height,
          }
        : null
    );

    chrome.runtime.sendMessage({
      type: 'CANVAS_CAMERA_RESULT',
      payload: { screenshots: serialized, targetSlot: initialSlot },
    });
  }
  window.close();
};

const App = () => (
  <ScreenshotAnnotationModal
    isOpen
    onClose={() => window.close()}
    variant="page"
    initialTargetSlot={initialSlot}
    onSubmitScreenshots={handleSubmit}
  />
);

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
