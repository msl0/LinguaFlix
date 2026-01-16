/**
 * PHASE 6: Player API Connector Module
 * ====================================
 * Connects to Netflix internal Player API
 * Retrieves subtitle tracks and player session
 * Uses exponential backoff retry logic
 * 
 * Dependencies: ZERO
 * Exports: { getPlayerAPI, getSubtitleTracks }
 * Debug: window.PlayerAPIConnector
 */

// Private state
// eslint-disable-next-line no-unused-vars
let cachedPlayerApp = null;
let cachedPlayerSession = null;
// eslint-disable-next-line no-unused-vars
let cachedVideoPlayer = null;
// eslint-disable-next-line no-unused-vars
let cachedSessionId = null;

/**
 * Helper: sleep(ms)
 * Promise-based delay for retry logic
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * getPlayerAPI(options)
 * Retrieves Netflix internal Player API with retry logic
 * 
 * @param {Object} options - Configuration for retry logic
 * @param {number} options.maxAttempts - Max retry attempts (default: 20)
 * @param {number} options.delayMs - Initial delay in ms (default: 250)
 * @param {number} options.backoffFactor - Delay multiplier (default: 1.5)
 * @param {number} options.maxDelayMs - Max delay cap (default: 2000)
 * @returns {Promise<Object|null>} { playerApp, api, videoPlayer, playerSession, sessionId } or null
 * 
 * How it works:
 * 1. Tries to access window.netflix.appContext.state.playerApp
 * 2. Validates that playerSession is available
 * 3. Uses exponential backoff if API not ready
 * 4. Caches result in module state
 * 
 * Why retry logic:
 * Netflix Player API loads asynchronously.
 * May not be available immediately on page load.
 * We retry with increasing delays until API is ready or max attempts reached.
 */
async function getPlayerAPI(options = {}) {
  console.debug('[LinguaFlix] getPlayerAPI() called');
  
  const { 
    maxAttempts = 20, 
    delayMs = 250, 
    backoffFactor = 1.5, 
    maxDelayMs = 2000 
  } = options;
  
  let delay = delayMs;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Try to access Netflix Player API
      const playerApp = window.netflix?.appContext?.state?.playerApp;
      
      if (!playerApp) {
        // API not ready yet, will retry
        console.debug(`[LinguaFlix] Player API not ready (attempt ${attempt + 1}/${maxAttempts})`);
      } else {
        // Get API object and video player
        const api = playerApp.getAPI?.();
        const videoPlayer = api?.videoPlayer;
        
        // Get all player session IDs
        const sessionIds = Array.isArray(videoPlayer?.getAllPlayerSessionIds?.()) 
          ? videoPlayer.getAllPlayerSessionIds() 
          : [];
        
        // Get first session (Netflix usually has one active session)
        const sessionId = sessionIds.length ? sessionIds[0] : null;
        
        // Get player session object
        const playerSession = sessionId 
          ? videoPlayer?.getVideoPlayerBySessionId(sessionId) 
          : null;

        if (playerSession) {
          // Success! Cache and return
          cachedPlayerApp = playerApp;
          cachedPlayerSession = playerSession;
          cachedVideoPlayer = videoPlayer;
          cachedSessionId = sessionId;
          
          console.log('[LinguaFlix] Player API ready:', {
            hasPlayerApp: !!playerApp,
            hasVideoPlayer: !!videoPlayer,
            sessionId
          });
          
          return { 
            playerApp, 
            api, 
            videoPlayer, 
            playerSession, 
            sessionId 
          };
        }
      }
    } catch (err) {
      console.error('[LinguaFlix] Error accessing player API:', err);
    }

    // Wait before retrying
    await sleep(delay);
    
    // Exponential backoff (250ms → 375ms → 562ms → 843ms → ...)
    delay = Math.min(Math.floor(delay * backoffFactor), maxDelayMs);
  }

  console.warn('[LinguaFlix] Player API not ready after ' + maxAttempts + ' attempts');
  return null;
}

/**
 * getSubtitleTracks(overlayLanguage, preferClosedCaptions)
 * Retrieves available subtitle tracks from Netflix Player API
 * 
 * @param {string} overlayLanguage - Language code for overlay (e.g., 'pl', 'en')
 * @param {boolean} preferClosedCaptions - If true, prefer CC tracks. If false, prefer SUBTITLES.
 * @returns {Object} { overlay, all, current }
 *   - overlay: Requested overlay language track or null
 *   - all: Array of all subtitle track objects
 *   - current: Currently active track object or null
 * 
 * IMPORTANT: Must call getPlayerAPI() first to cache playerSession.
 * 
 * Track object structure (from Netflix API):
 * {
 *   trackId: number,
 *   bcp47: string (e.g., 'pl', 'en-US'),
 *   displayName: string,
 *   language: string,
 *   rawTrackType: string (e.g., 'SUBTITLES', 'CLOSEDCAPTIONS'),
 *   isNoneTrack: boolean
 * }
 * 
 * Selection logic:
 * 1. Filter by language: bcp47.startsWith(overlayLanguage)
 * 2. Exclude "none" tracks
 * 3. If preferClosedCaptions=true: prefer CC, fallback to SUBTITLES, then any available
 * 4. If preferClosedCaptions=false: prefer SUBTITLES, fallback to CC, then any available
 */
function getSubtitleTracks(overlayLanguage = 'pl', preferClosedCaptions = false) {
  console.debug('[LinguaFlix] getSubtitleTracks() called with language:', overlayLanguage, 'preferCC:', preferClosedCaptions);
  
  const result = {
    overlay: null,
    all: [],
    current: null
  };

  if (!cachedPlayerSession) {
    console.warn('[LinguaFlix] Cannot get subtitle tracks: Player session not cached. Call getPlayerAPI() first.');
    return result;
  }

  try {
    // Get all available subtitle tracks
    const trackList = cachedPlayerSession.getTimedTextTrackList?.() || [];
    result.all = trackList;
    
    // Get currently active track
    result.current = cachedPlayerSession.getTextTrack?.() || null;

    // Filter by language and exclude "none" tracks
    const matchingTracks = trackList.filter(track => 
      track?.bcp47?.startsWith(overlayLanguage) && !track?.isNoneTrack
    );

    if (matchingTracks.length === 0) {
      console.warn('[LinguaFlix] No subtitle tracks found for language:', overlayLanguage);
      return result;
    }

    // Select track based on rawTrackType preference
    if (preferClosedCaptions) {
      // Prefer CC, fallback to SUBTITLES, then any
      result.overlay = matchingTracks.find(t => t?.rawTrackType === 'CLOSEDCAPTIONS') ||
                       matchingTracks.find(t => t?.rawTrackType === 'SUBTITLES') ||
                       matchingTracks[0];
    } else {
      // Prefer SUBTITLES, fallback to CC, then any
      result.overlay = matchingTracks.find(t => t?.rawTrackType === 'SUBTITLES') ||
                       matchingTracks.find(t => t?.rawTrackType === 'CLOSEDCAPTIONS') ||
                       matchingTracks[0];
    }

    console.log('[LinguaFlix] Subtitle tracks:', {
      hasOverlay: !!result.overlay,
      overlayLanguage,
      preferCC: preferClosedCaptions,
      selectedType: result.overlay?.rawTrackType,
      totalTracks: trackList.length,
      currentTrack: result.current?.bcp47
    });

  } catch (err) {
    console.error('[LinguaFlix] Error getting subtitle tracks:', err);
  }

  return result;
}

/**
 * cleanup()
 * Clears cached Player API references
 * Called on navigation to prevent stale references
 */
function cleanup() {
  console.debug('[LinguaFlix] PlayerAPIConnector cleanup() called');
  
  cachedPlayerApp = null;
  cachedPlayerSession = null;
  cachedVideoPlayer = null;
  cachedSessionId = null;
  
  console.log('[LinguaFlix] Player API cache cleared');
}

// ============================================
// EXPORTS
// ============================================

export { getPlayerAPI, getSubtitleTracks, cleanup };

console.log('[LinguaFlix] PlayerAPIConnector module loaded');
