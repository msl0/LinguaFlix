/**
 * ETAP 4: Video Detector Module
 * =============================
 * Detects <video> element appearance in Netflix page
 * Uses MutationObserver to find video element
 * Notifies other modules via callback
 * 
 * Dependencies: ZERO
 * Exports: { detectVideo, cleanup }
 * Debug: window.VideoDetector
 */

// Private state
let videoObserver = null;
let onVideoDetectedCallback = null;

/**
 * detectVideo(onVideoDetected)
 * Sets up MutationObserver to find <video> element
 * 
 * @param {Function} onVideoDetected - Callback fired when <video> found
 *                                     Params: (videoElement: HTMLVideoElement)
 * @returns {void}
 * 
 * How it works:
 * 1. Watches document.body for changes (Netflix adds video dynamically)
 * 2. When <video> element appears, fires callback and disconnects
 * 3. Single-shot pattern: one detection per detectVideo() call
 * 
 * IMPORTANT: No quick check for existing video!
 * Quick check breaks navigation: old video from previous page triggers callback,
 * observer disconnects, then new video appears but is never detected.
 * 
 * To catch new videos after navigation: navigation-detector must call cleanup()
 * then detectVideo() again for new page.
 */
function detectVideo(onVideoDetected) {
  console.debug('[LinguaFlix] detectVideo() called');
  
  if (!onVideoDetected || typeof onVideoDetected !== 'function') {
    console.error('[LinguaFlix] detectVideo: onVideoDetected must be a function');
    return;
  }

  onVideoDetectedCallback = onVideoDetected;

  // Set up observer to detect when <video> is added or changed
  videoObserver = new MutationObserver((mutations, observer) => {
    // Look for <video> element in the DOM
    const video = document.querySelector('video');
    
    if (video) {
      console.log('[LinguaFlix] Video element detected via MutationObserver');
      
      // Single-shot: disconnect after first detection
      observer.disconnect();
      videoObserver = null;

      // Fire callback with detected video element
      try {
        if (onVideoDetectedCallback && typeof onVideoDetectedCallback === 'function') {
          onVideoDetectedCallback(video);
        }
      } catch (e) {
        console.error('[LinguaFlix] Error in onVideoDetected callback:', e);
      }
    }
  });

  // Watch entire DOM tree for changes
  // childList: Watch for added/removed elements
  // subtree: Watch entire DOM, not just direct children
  videoObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  console.log('[LinguaFlix] Video detection started');
}

/**
 * cleanup()
 * Stops MutationObserver and clears state
 * CRITICAL for preventing memory leaks when navigating away from /watch/ page
 */
function cleanup() {
  console.debug('[LinguaFlix] VideoDetector cleanup() called');

  // Stop observing mutations
  if (videoObserver) {
    try {
      videoObserver.disconnect();
    } catch (e) {
      console.error('[LinguaFlix] Error disconnecting observer:', e);
    }
    videoObserver = null;
  }

  // Clear callback reference
  onVideoDetectedCallback = null;

  console.log('[LinguaFlix] Video detection cleaned up');
}

// ============================================
// EXPORTS
// ============================================

export { detectVideo, cleanup };

console.log('[LinguaFlix] VideoDetector module loaded');
