import { useEffect, useRef } from 'react';

export const usePortal = (id: string = 'portal-root') => {
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Check if portal container already exists
    let portalContainer = document.getElementById(id) as HTMLDivElement;
    
    if (!portalContainer) {
      // Create portal container if it doesn't exist
      portalContainer = document.createElement('div');
      portalContainer.id = id;
      portalContainer.style.position = 'relative';
      portalContainer.style.zIndex = '999999';
      portalContainer.style.pointerEvents = 'none'; // Let clicks pass through when empty
      document.body.appendChild(portalContainer);
    }
    
    portalRef.current = portalContainer;

    // Cleanup function to remove empty portal containers
    return () => {
      // Check if portal container still exists and is empty before removing
      if (portalContainer &&
          portalContainer.parentNode === document.body &&
          portalContainer.children.length === 0) {
        try {
          document.body.removeChild(portalContainer);
        } catch (error) {
          // Silently handle case where node was already removed
          console.debug('Portal container already removed:', id);
        }
      }
    };
  }, [id]);

  return portalRef.current;
};