/**
 * subtitle-display.js
 *
 * Manages subtitle overlay DOM element
 * Handles fullscreen mode and z-index adjustments
 * Show/hide translated subtitle text
 *
 * Public API:
 * - showSubtitle(text) → void
 * - hideSubtitle() → void
 * - cleanup() → void
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Z-index values to ensure overlay is always visible
const FULLSCREEN_Z_INDEX = '2147483647'; // Max z-index (2^31 - 1) for fullscreen mode
const NORMAL_Z_INDEX = '10000';          // Standard high z-index for normal mode

// ============================================================================
// MODULE STATE (private)
// ============================================================================

let overlayElement = null;
let fullscreenHandler = null;
let fullscreenListenerAttached = false;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Display translated subtitle text in overlay
 * @param {string} text - Subtitle text (may contain \n for line breaks)
 */
function showSubtitle(text) {
  try {
    const existing = document.getElementById('linguaflix-overlay');

    // Setup fullscreen handler (lazy initialization)
    if (!fullscreenHandler) {
      fullscreenHandler = () => {
        const overlay = overlayElement || document.getElementById('linguaflix-overlay');
        if (!overlay) return;
        
        const targetParent = document.fullscreenElement || document.body;
        if (overlay.parentNode !== targetParent) {
          try { 
            targetParent.appendChild(overlay); 
          } catch (e) { 
            console.warn('[LinguaFlix] Failed to move overlay to fullscreen:', e);
          }
        }
        overlay.style.zIndex = document.fullscreenElement ? FULLSCREEN_Z_INDEX : NORMAL_Z_INDEX;
      };
    }

    // Attach fullscreen listener (once)
    if (!fullscreenListenerAttached) {
      document.addEventListener('fullscreenchange', fullscreenHandler);
      fullscreenListenerAttached = true;
    }

    const targetParent = document.fullscreenElement || document.body;
    const zIndex = document.fullscreenElement ? FULLSCREEN_Z_INDEX : NORMAL_Z_INDEX;

    // Reuse existing overlay
    if (existing) {
      existing.style.display = 'block';
      existing.style.zIndex = zIndex;
      existing.textContent = text || '';
      overlayElement = existing;
      fullscreenHandler(); // Ensure correct parent
      return;
    }

    // Create new overlay
    const overlay = document.createElement('div');
    overlay.id = 'linguaflix-overlay';
    overlay.style.cssText = [
      'position: fixed',
      'top: 12%',
      'left: 50%',
      'transform: translate(-50%, 0)',
      'background: rgba(0, 0, 0, 0.9)',
      'color: white',
      'padding: 20px 30px',
      'border-radius: 10px',
      'font-size: 24px',
      'font-weight: bold',
      'z-index: ' + zIndex,
      'max-width: 80%',
      'text-align: center',
      'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7)',
      'border: 2px solid #4CAF50',
      'display: block',
      "font-family: 'Helvetica Neue', Arial, sans-serif",
      'pointer-events: none',
      'line-height: 1.4',
      'white-space: pre-wrap'
    ].join('; ');

    overlay.textContent = text || '';
    targetParent.appendChild(overlay);
    overlayElement = overlay;
    fullscreenHandler(); // Ensure correct z-index
    
    console.log('[LinguaFlix] Subtitle displayed');
  } catch (err) {
    console.error('[LinguaFlix] Error showing subtitle:', err);
  }
}

/**
 * Hide the overlay
 */
function hideSubtitle() {
  try {
    const overlay = overlayElement || document.getElementById('linguaflix-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.textContent = '';
      console.log('[LinguaFlix] Subtitle hidden');
    }
  } catch (err) {
    console.error('[LinguaFlix] Error hiding subtitle:', err);
  }
}

/**
 * Cleanup: removes overlay from the DOM and detaches listeners
 */
function cleanup() {
  try {
    hideSubtitle();
    
    const overlay = overlayElement || document.getElementById('linguaflix-overlay');
    if (overlay?.parentNode) {
      overlay.remove();
    }
    
    if (fullscreenListenerAttached && fullscreenHandler) {
      document.removeEventListener('fullscreenchange', fullscreenHandler);
    }
    
    overlayElement = null;
    fullscreenHandler = null;
    fullscreenListenerAttached = false;
    
    console.log('[LinguaFlix] Display cleanup complete');
  } catch (err) {
    console.error('[LinguaFlix] Error during display cleanup:', err);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { showSubtitle, hideSubtitle, cleanup };

console.log('[LinguaFlix] subtitle-display.js loaded');
