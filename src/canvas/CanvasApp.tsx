import React from 'react';
import { ScreenshotAnnotationModal } from '../sidepanel/components/ScreenshotAnnotationModal';

/**
 * Full-page React app for the Screenshot Combiner canvas.
 * Uses ScreenshotAnnotationModal with variant="page" for a larger preview experience.
 */
export const CanvasApp: React.FC = () => {
  // Parse URL params for initial slot selection
  const urlParams = new window.URLSearchParams(window.location.search);
  const initialSlot = parseInt(urlParams.get('slot') || '0', 10);

  const handleClose = () => {
    // Close the tab when user clicks close
    window.close();
  };

  return (
    <ScreenshotAnnotationModal
      isOpen={true}
      onClose={handleClose}
      variant="page"
      initialTargetSlot={initialSlot}
    />
  );
};

export default CanvasApp;
