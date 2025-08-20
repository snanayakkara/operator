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
      if (portalContainer && portalContainer.children.length === 0) {
        document.body.removeChild(portalContainer);
      }
    };
  }, [id]);

  return portalRef.current;
};