/**
 * ETAP 5: Playback Detector Module
 * =================================
 * Detects pause/play events on <video> element
 * Manages event listeners and notifies via callbacks
 * 
 * Dependencies: ZERO
 * Exports: { setupPlaybackDetection, cleanup }
 * Debug: window.PlaybackDetector
 */

// Private state
let trackedVideo = null;
let onPauseCallback = null;
let onPlayCallback = null;
let pauseHandler = null;
let playHandler = null;

/**
 * setupPlaybackDetection(video, onPause, onPlay)
 * Attaches pause/play event listeners to video element
 * 
 * @param {HTMLVideoElement} video - Video element to monitor
 * @param {Function} onPause - Callback fired when video pauses
 * @param {Function} onPlay - Callback fired when video resumes
 * @returns {void}
 * 
 * How it works:
 * 1. Attaches 'pause' and 'play' event listeners to video
 * 2. When video state changes, fires appropriate callback
 * 3. Prevents duplicate listeners on same video element
 * 
 * IMPORTANT: Only one video is tracked at a time.
 * Calling setupPlaybackDetection() again with a new video
 * will automatically clean up the old video's listeners.
 */
function setupPlaybackDetection(video, onPause, onPlay) {
  console.debug('[LinguaFlix] setupPlaybackDetection() called');
  
  if (!video || !(video instanceof HTMLVideoElement)) {
    console.error('[LinguaFlix] setupPlaybackDetection: invalid video element');
    return;
  }

  if (!onPause || typeof onPause !== 'function') {
    console.error('[LinguaFlix] setupPlaybackDetection: onPause must be a function');
    return;
  }

  if (!onPlay || typeof onPlay !== 'function') {
    console.error('[LinguaFlix] setupPlaybackDetection: onPlay must be a function');
    return;
  }

  // If we're already tracking this video, skip
  if (trackedVideo === video) {
    console.debug('[LinguaFlix] Video already tracked, skipping');
    return;
  }

  // Clean up previous video if exists
  if (trackedVideo) {
    console.debug('[LinguaFlix] Cleaning up previous video listeners before attaching new ones');
    cleanup();
  }

  // Store references
  trackedVideo = video;
  onPauseCallback = onPause;
  onPlayCallback = onPlay;

  // Create event handlers
  pauseHandler = () => {
    console.log('[LinguaFlix] Video paused');
    try {
      if (onPauseCallback && typeof onPauseCallback === 'function') {
        onPauseCallback();
      }
    } catch (e) {
      console.error('[LinguaFlix] Error in onPause callback:', e);
    }
  };

  playHandler = () => {
    console.log('[LinguaFlix] Video resumed');
    try {
      if (onPlayCallback && typeof onPlayCallback === 'function') {
        onPlayCallback();
      }
    } catch (e) {
      console.error('[LinguaFlix] Error in onPlay callback:', e);
    }
  };

  // Attach listeners
  video.addEventListener('pause', pauseHandler);
  video.addEventListener('play', playHandler);

  console.log('[LinguaFlix] Attached pause/play listeners to video');
}

/**
 * cleanup()
 * Removes all event listeners and clears state
 * CRITICAL for preventing memory leaks on navigation
 */
function cleanup() {
  console.debug('[LinguaFlix] PlaybackDetector cleanup() called');

  // Remove event listeners
  if (trackedVideo && pauseHandler && playHandler) {
    try {
      trackedVideo.removeEventListener('pause', pauseHandler);
      trackedVideo.removeEventListener('play', playHandler);
    } catch (e) {
      console.error('[LinguaFlix] Error removing event listeners:', e);
    }
  }

  // Clear references
  trackedVideo = null;
  onPauseCallback = null;
  onPlayCallback = null;
  pauseHandler = null;
  playHandler = null;

  console.log('[LinguaFlix] Playback detection cleaned up');
}

// ============================================
// EXPORTS
// ============================================

export { setupPlaybackDetection, cleanup };

console.log('[LinguaFlix] PlaybackDetector module loaded');
