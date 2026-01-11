/**
 * ETAP 3: Navigation Detector Module
 * ===================================
 * Detects URL changes in Netflix SPA (Single Page App)
 * Hooks history API (pushState, replaceState) and popstate events
 * 
 * Dependencies: ZERO
 * Exports: { setupRouteDetection, cleanup }
 * Debug: window.NavigationDetector
 */

// Private state
let routeDetectorAttached = false;
let lastUrlTracked = window.location.href;
let onRouteChangeCallback = null;
let originalPushState = null;
let originalReplaceState = null;
let popstateHandler = null;

/**
 * setupRouteDetection(onRouteChange)
 * Hooks history API to detect navigation in Netflix SPA
 * 
 * @param {Function} onRouteChange - Callback fired on URL change
 *                                   Called with new URL
 *                                   Params: (newUrl: string)
 * @returns {void}
 * 
 * IMPORTANT: Should only be called once. Repeated calls are no-ops.
 * 
 * Hooks three navigation sources:
 * 1. history.pushState() - e.g., Netflix browse → watch page
 * 2. history.replaceState() - e.g., Back button replaces state
 * 3. popstate event - e.g., Browser back/forward buttons
 */
function setupRouteDetection(onRouteChange) {
  console.debug('[LinguaFlix] setupRouteDetection() called');
  
  // Guard: Only attach once
  if (routeDetectorAttached) {
    console.debug('[LinguaFlix] Route detector already attached, skipping');
    return;
  }
  routeDetectorAttached = true;
  onRouteChangeCallback = onRouteChange;

  // Save original functions before wrapping
  originalPushState = history.pushState;
  originalReplaceState = history.replaceState;

  /**
   * Internal: Check if URL changed and fire callback
   */
  const handleRouteChange = () => {
    const newUrl = window.location.href;
    
    // Ignore if URL didn't actually change (edge case)
    if (newUrl === lastUrlTracked) {
      return;
    }

    lastUrlTracked = newUrl;
    console.log('[LinguaFlix] Route change detected: ' + newUrl);

    // Fire callback with new URL
    if (onRouteChangeCallback && typeof onRouteChangeCallback === 'function') {
      try {
        onRouteChangeCallback(newUrl);
      } catch (e) {
        console.error('[LinguaFlix] Error in onRouteChangeCallback:', e);
      }
    }
  };

  /**
   * Hook 1: history.pushState()
   * Fired when Netflix navigates (e.g., browse → watch page)
   */
  history.pushState = function pushStateWrapper(state, title, url) {
    console.debug('[LinguaFlix] history.pushState called');
    const result = originalPushState.apply(this, arguments);
    handleRouteChange();
    return result;
  };

  /**
   * Hook 2: history.replaceState()
   * Fired when Netflix replaces state (e.g., back button)
   */
  history.replaceState = function replaceStateWrapper(state, title, url) {
    console.debug('[LinguaFlix] history.replaceState called');
    const result = originalReplaceState.apply(this, arguments);
    handleRouteChange();
    return result;
  };

  /**
   * Hook 3: popstate event
   * Fired when browser back/forward button clicked
   */
  popstateHandler = () => {
    console.debug('[LinguaFlix] popstate event');
    handleRouteChange();
  };
  window.addEventListener('popstate', popstateHandler);

  console.log('[LinguaFlix] Route detection setup complete');
}

/**
 * cleanup()
 * Removes all event listeners and restores original history functions
 * CRITICAL for preventing memory leaks on page navigation
 */
function cleanup() {
  console.debug('[LinguaFlix] NavigationDetector cleanup() called');

  // Restore original functions
  if (originalPushState) {
    history.pushState = originalPushState;
  }
  if (originalReplaceState) {
    history.replaceState = originalReplaceState;
  }

  // Remove popstate listener
  if (popstateHandler) {
    window.removeEventListener('popstate', popstateHandler);
    popstateHandler = null;
  }

  // Reset state
  routeDetectorAttached = false;
  onRouteChangeCallback = null;

  console.log('[LinguaFlix] Route detection cleaned up');
}

// ============================================
// ============================================================================
// EXPORTS
// ============================================================================

export { setupRouteDetection, cleanup };

console.log('[LinguaFlix] NavigationDetector module loaded');
