/**
 * ETAP 7: Subtitle Fetcher Module
 * ================================
 * Detects TTML subtitle requests via PerformanceObserver
 * Fetches TTML XML from Netflix CDN
 * Parses and caches subtitles
 * Triggers initial Polish subtitle fetch
 * 
 * Dependencies: SubtitleParser (parseTTML, findCueAt)
 * Exports: { setupSubtitleFetching, triggerPolishSubtitleFetch, getSubtitleCache, cleanup }
 * Debug: window.SubtitleFetcher
 */

import { parseTTML } from './subtitle-parser.js';

// Private state
let performanceObserver = null;
let processedUrls = new Set(); // Track fetched URLs to avoid duplicates
let subtitleCache = {};        // { "videoId_language": [cue1, cue2, ...] }
let playerSessionRef = null;   // Reference to Netflix player session (for videoId)

/**
 * setupSubtitleFetching(playerSession)
 * Sets up PerformanceObserver to detect TTML subtitle requests
 * 
 * @param {Object} playerSession - Netflix player session (from PlayerAPIConnector)
 * @returns {void}
 * 
 * How it works:
 * 1. PerformanceObserver watches all network requests
 * 2. When TTML request detected (oca.nflxvideo.net/?o=), fetch it
 * 3. Parse TTML XML into cue objects
 * 4. Cache cues by videoId_language key
 * 
 * Why PerformanceObserver:
 * Netflix fetches TTML files dynamically via XHR.
 * We can't intercept XHR directly (same-origin policy).
 * PerformanceObserver gives us URLs of all requests after they complete.
 * We then re-fetch the same URL to get TTML content.
 */
function setupSubtitleFetching(playerSession) {
  console.debug('[LinguaFlix] setupSubtitleFetching() called');
  
  if (!playerSession) {
    console.error('[LinguaFlix] setupSubtitleFetching: playerSession required');
    return;
  }

  playerSessionRef = playerSession;

  // Disconnect previous observer if exists (route changes, re-inits)
  if (performanceObserver) {
    try {
      performanceObserver.disconnect();
    } catch (e) {
      console.error('[LinguaFlix] Error disconnecting previous observer:', e);
    }
    performanceObserver = null;
  }

  // Reset processed URLs for new video
  processedUrls = new Set();

  try {
    // Create PerformanceObserver to watch network requests
    performanceObserver = new PerformanceObserver((list) => {
      try {
        const entries = list.getEntries();
        
        for (const entry of entries) {
          // Check if this is a subtitle request
          if (isSubtitleRequest(entry.name)) {
            // Skip if already processed
            if (processedUrls.has(entry.name)) {
              continue;
            }
            
            processedUrls.add(entry.name);
            console.log('[LinguaFlix] TTML request detected:', entry.name);
            
            // Fetch TTML XML independently
            fetch(entry.name)
              .then(response => response.text())
              .then(xmlString => handleSubtitleResponse(xmlString, entry.name))
              .catch(err => console.warn('[LinguaFlix] Failed to fetch TTML:', err));
          }
        }
      } catch (err) {
        console.error('[LinguaFlix] Error in PerformanceObserver callback:', err);
      }
    });

    // Start observing resource entries (network requests)
    performanceObserver.observe({ entryTypes: ['resource'] });
    
    console.log('[LinguaFlix] PerformanceObserver attached for subtitle detection');
  } catch (err) {
    console.error('[LinguaFlix] PerformanceObserver setup failed:', err);
  }
}

/**
 * isSubtitleRequest(url)
 * Checks if URL is a Netflix TTML subtitle request
 * 
 * Netflix TTML URLs have pattern:
 * https://...oca.nflxvideo.net/.../?o=...
 */
function isSubtitleRequest(url) {
  return url.includes('oca.nflxvideo.net') && url.includes('/?o=');
}

/**
 * handleSubtitleResponse(xmlString, url)
 * Parses TTML XML and caches subtitles
 * 
 * @param {string} xmlString - TTML XML content
 * @param {string} url - Request URL (for logging)
 * @returns {void}
 */
function handleSubtitleResponse(xmlString, url) {
  try {
    // Parse TTML using SubtitleParser module
    const result = parseTTML(xmlString);
    
    if (!result || !result.cues) {
      console.warn('[LinguaFlix] TTML parsing returned no cues');
      return;
    }

    const { cues, language } = result;

    // Get video ID from Netflix player session
    if (!playerSessionRef || !playerSessionRef.getMovieId) {
      console.warn('[LinguaFlix] Cannot get video ID: player session not available');
      return;
    }

    const videoId = playerSessionRef.getMovieId();
    const cacheKey = `${videoId}_${language}`;

    // Cache subtitles
    subtitleCache[cacheKey] = cues;
    
    console.log(`[LinguaFlix] Cached ${cues.length} subtitles for ${cacheKey}`);
  } catch (err) {
    console.error('[LinguaFlix] Error handling subtitle response:', err);
  }
}

/**
 * triggerOverlaySubtitleFetch(overlayTrack, currentTrack, language)
 * Triggers initial overlay subtitle fetch by switching tracks
 * 
 * @param {Object} overlayTrack - Overlay language track object from Netflix API
 * @param {Object} currentTrack - Currently active track object
 * @param {string} language - Language code (e.g., 'pl', 'en')
 * @returns {void}
 * 
 * How it works:
 * 1. Switch to overlay track via setTimedTextTrack()
 * 2. Netflix fetches TTML for overlay track
 * 3. PerformanceObserver catches the request
 * 4. After 500ms, revert to original track
 * 
 * Why this approach:
 * Netflix only fetches TTML when track is activated.
 * We need overlay TTML early so it's cached when user pauses.
 * We switch momentarily then revert to avoid UI flicker.
 */
function triggerOverlaySubtitleFetch(overlayTrack, currentTrack, language = 'pl') {
  console.debug(`[LinguaFlix] triggerOverlaySubtitleFetch() called for language: ${language}`);
  
  if (!playerSessionRef) {
    console.warn('[LinguaFlix] Cannot trigger fetch: player session not available');
    return;
  }

  if (!overlayTrack) {
    console.warn(`[LinguaFlix] Overlay track (${language}) not provided, skipping fetch`);
    return;
  }

  try {
    // Switch to overlay track to trigger TTML fetch
    console.log(`[LinguaFlix] Switching to ${language} track to trigger TTML fetch`);
    playerSessionRef.setTimedTextTrack(overlayTrack);

    // Revert to original track after short delay
    setTimeout(() => {
      if (currentTrack) {
        playerSessionRef.setTimedTextTrack(currentTrack);
        console.log('[LinguaFlix] Reverted to original subtitle track');
      }
    }, 500);
  } catch (err) {
    console.error('[LinguaFlix] Error triggering overlay subtitle fetch:', err);
  }
}

/**
 * getSubtitleCache()
 * Returns cached subtitles
 * 
 * @returns {Object} Cache object { "videoId_language": [cues] }
 */
function getSubtitleCache() {
  return subtitleCache;
}

/**
 * cleanup()
 * Stops PerformanceObserver and clears cache
 * CRITICAL for preventing memory leaks on navigation
 */
function cleanup() {
  console.debug('[LinguaFlix] SubtitleFetcher cleanup() called');

  // Disconnect observer
  if (performanceObserver) {
    try {
      performanceObserver.disconnect();
    } catch (e) {
      console.error('[LinguaFlix] Error disconnecting observer:', e);
    }
    performanceObserver = null;
  }

  // Clear state
  processedUrls.clear();
  subtitleCache = {};
  playerSessionRef = null;

  console.log('[LinguaFlix] Subtitle fetching cleaned up');
}

// ============================================
// EXPORTS
// ============================================

export { setupSubtitleFetching, triggerOverlaySubtitleFetch, getSubtitleCache, cleanup };

console.log('[LinguaFlix] SubtitleFetcher module loaded');
