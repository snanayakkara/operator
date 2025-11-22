import { useEffect, useRef, useState } from 'react';

export const usePortal = (id: string = 'portal-root') => {
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const ensurePortalExists = () => {
      // Check if portal container already exists AND is still in the DOM
      let portalContainer = document.getElementById(id) as HTMLDivElement;

      // If container exists but is not in the document, it's stale
      if (portalContainer && !document.body.contains(portalContainer)) {
        console.warn(`🚨 Portal container "${id}" exists but not in DOM - recreating`);
        portalContainer = null as unknown as HTMLDivElement;
      }

      if (!portalContainer) {
        // Create portal container if it doesn't exist
        console.log(`🏗️ Creating portal container: ${id}`);
        portalContainer = document.createElement('div');
        portalContainer.id = id;
        portalContainer.style.position = 'relative';
        portalContainer.style.zIndex = '999999';
        portalContainer.style.pointerEvents = 'none'; // Let clicks pass through when empty
        document.body.appendChild(portalContainer);
      }

      portalRef.current = portalContainer;
      setPortalNode(portalContainer);
      return portalContainer;
    };

    // Initial setup
    const _portalContainer = ensurePortalExists();

    // Set up MutationObserver to detect if portal gets removed from DOM
    observerRef.current = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check if our portal container was removed
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          const removed = Array.from(mutation.removedNodes).some(
            node => node === portalRef.current
          );

          if (removed) {
            console.warn(`🚨 Portal container "${id}" was removed from DOM - recreating`);
            ensurePortalExists();
          }
        }
      }
    });

    // Observe document.body for child list changes
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: false
    });

    // Periodic validation to ensure portal still exists (every 3 seconds)
    const validationInterval = window.setInterval(() => {
      if (portalRef.current && !document.body.contains(portalRef.current)) {
        console.warn(`🚨 Portal container "${id}" missing during validation - recreating`);
        ensurePortalExists();
      }
    }, 3000);

    // Cleanup function - DO NOT remove portal container
    // This prevents race conditions where the portal is removed while still needed
    return () => {
      console.log(`🧹 usePortal cleanup for "${id}" - keeping container in DOM`);

      // Stop observing
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // Clear validation interval
      window.clearInterval(validationInterval);

      // Note: We intentionally do NOT remove the portal container here
      // This prevents race conditions and ensures portal persists across remounts
      // The container is lightweight and will be reused by subsequent mounts
    };
  }, [id]);

  return portalNode;
};
