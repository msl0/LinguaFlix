'use strict';

/**
 * LinguaFlix Content Script
 * Main entry point - uses dynamic imports for ES6 modules
 */

console.log('[LinguaFlix] Content script starting...');

const scriptUrl = document.currentScript?.src || '';
let SubtitleParser, SubtitleDisplay, NavigationDetector, VideoDetector, PlaybackDetector, PlayerAPIConnector, SubtitleFetcher, Settings;
let userSettings = null; // Store loaded settings

async function loadModules() {
  console.log('[LinguaFlix] Loading modules via dynamic import...');
  
  const baseUrl = scriptUrl.substring(0, scriptUrl.lastIndexOf('/'));
  const modules = await Promise.all([
    import(`${baseUrl}/modules/subtitle-parser.js`),
    import(`${baseUrl}/modules/subtitle-display.js`),
    import(`${baseUrl}/modules/navigation-detector.js`),
    import(`${baseUrl}/modules/video-detector.js`),
    import(`${baseUrl}/modules/playback-detector.js`),
    import(`${baseUrl}/modules/player-api-connector.js`),
    import(`${baseUrl}/modules/subtitle-fetcher.js`),
    import(`${baseUrl}/modules/settings.js`)
  ]);
  
  [SubtitleParser, SubtitleDisplay, NavigationDetector, VideoDetector, PlaybackDetector, PlayerAPIConnector, SubtitleFetcher, Settings] = modules;
  
  // Load user settings
  userSettings = await Settings.getSettings();
  console.log('[LinguaFlix] User settings loaded:', userSettings);
  
  console.log('[LinguaFlix] All modules loaded');
}

function start() {
  console.log('[LinguaFlix] Orchestrator start()');

  NavigationDetector.setupRouteDetection((newUrl) => {
    console.log('[LinguaFlix] Route changed:', newUrl);
    cleanup();
    if (newUrl.includes('/watch/')) armVideoFlow();
  });

  if (window.location.href.includes('/watch/')) armVideoFlow();
}

async function armVideoFlow() {
  console.log('[LinguaFlix] Arming video flow...');

  VideoDetector.detectVideo(async (video) => {
    try {
      console.log('[LinguaFlix] Video detected, initializing subtitle system...');

      let api = null;
      let retryCount = 0;
      const maxRetries = 10;
      
      while (retryCount < maxRetries) {
        api = await PlayerAPIConnector.getPlayerAPI();
        
        if (!api?.playerSession) {
          console.warn('[LinguaFlix] Player session not available (attempt ' + (retryCount + 1) + '/' + maxRetries + ')');
          retryCount++;
          continue;
        }
        
        if (api.sessionId && !api.sessionId.includes('watch')) {
          console.warn('[LinguaFlix] Not a watch session yet:', api.sessionId, '- retrying (attempt ' + (retryCount + 1) + '/' + maxRetries + ')');
          retryCount++;
          SubtitleDisplay?.cleanup();
          SubtitleFetcher?.cleanup();
          PlaybackDetector?.cleanup();
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        console.log('[LinguaFlix] Valid watch session confirmed:', api.sessionId);
        break;
      }
      
      if (!api?.playerSession) {
        console.error('[LinguaFlix] Player session still not available after retries');
        return;
      }

      SubtitleFetcher.setupSubtitleFetching(api.playerSession);
      
      // Get overlay language and CC preference from settings
      const overlayLanguage = userSettings?.overlayLanguage || 'pl';
      const preferClosedCaptions = userSettings?.preferClosedCaptions || false;
      const tracks = PlayerAPIConnector.getSubtitleTracks(overlayLanguage, preferClosedCaptions);
      
      if (tracks.overlay) {
        SubtitleFetcher.triggerOverlaySubtitleFetch(tracks.overlay, tracks.current, overlayLanguage);
      } else {
        console.warn(`[LinguaFlix] Overlay subtitles (${overlayLanguage}) not available`);
      }

      PlaybackDetector.setupPlaybackDetection(
        video,
        () => {
          const timeMs = video.currentTime * 1000;
          const cache = SubtitleFetcher.getSubtitleCache();
          const videoId = api.playerSession.getMovieId?.() || 'unknown';
          const cacheKey = `${videoId}_${overlayLanguage}`;
          const cues = cache[cacheKey] || [];
          
          const cue = SubtitleParser.findCueAt(timeMs, cues);
          if (cue?.text?.trim()) {
            SubtitleDisplay.showSubtitle(cue.text);
          } else {
            SubtitleDisplay.hideSubtitle();
          }
        },
        () => SubtitleDisplay.hideSubtitle()
      );

      console.log('[LinguaFlix] Subtitle system initialized ✓');
    } catch (err) {
      console.error('[LinguaFlix] Orchestrator error:', err);
    }
  });
}

function cleanup() {
  console.debug('[LinguaFlix] Running cleanup...');
  PlaybackDetector?.cleanup();
  VideoDetector?.cleanup();
  SubtitleDisplay?.cleanup();
  SubtitleFetcher?.cleanup();
  // NOTE: NavigationDetector NOT cleaned - it must persist to detect next navigation
  PlayerAPIConnector?.cleanup();
}

// Initialize: load modules then start
(async () => {
  try {
    await loadModules();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
    
    window.LinguaFlix = { start, cleanup };
    console.log('[LinguaFlix] Content script ready');
  } catch (err) {
    console.error('[LinguaFlix] Failed to load modules:', err);
  }
})();
