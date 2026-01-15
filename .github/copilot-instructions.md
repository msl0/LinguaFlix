# LinguaFlix - AI Coding Agent Instructions

## Project Overview

**LinguaFlix** is a Chrome extension that shows second subtitles in chosen language when paused Netflix player. Second subtitles disappear when playing. It uses a **modular architecture** with 8 specialized modules orchestrated by `src/content.js`.

### Key Architecture Decision
The extension uses **dynamic ES6 imports** (see `content.js`) instead of static script tags. This allows:
- Isolated module scopes (prevents global namespace pollution)
- Selective module loading 
- Module-level error handling
- Debug access via `window.SubtitleFetcher`, `window.VideoDetector`, etc.

## The 8 Core Modules

Each module exports specific functions with minimal cross-module dependencies (only SubtitleFetcher imports SubtitleParser):

1. **subtitle-parser.js** - Parse TTML XML into cue objects with `parseTTML()`, find text at time with `findCueAt(cues, seconds)`
2. **video-detector.js** - Detect `<video>` element and call callback `detectVideo(callback)`
3. **playback-detector.js** - Monitor pause/play events via `setupPlaybackDetection(video, onPause, onPlay)`
4. **navigation-detector.js** - Detect Netflix route changes via `setupRouteDetection(callback)`
5. **player-api-connector.js** - Access Netflix player session object via `getPlayerAPI()` (retries 10x on failure)
6. **subtitle-fetcher.js** - Monitor TTML requests via PerformanceObserver, cache subtitles via `setupSubtitleFetching(playerSession)`
7. **subtitle-display.js** - Show/hide additional subtitle overlay via `showSubtitle(text)`, `hideSubtitle()`
8. **settings.js** - Read user config from DOM element (injected by settings-injector.js) via `getSettings()`

**Module Graph Flow:**
```text
content.js (orchestrator)
  ├─→ video-detector → VideoDetector.detectVideo()
  ├─→ playback-detector → PlaybackDetector.setupPlaybackDetection()
  ├─→ player-api-connector → PlayerAPIConnector.getPlayerAPI()
  ├─→ subtitle-fetcher → SubtitleFetcher.setupSubtitleFetching()
  │    └─→ (imports) subtitle-parser
  ├─→ subtitle-display → SubtitleDisplay.showSubtitle()
  ├─→ navigation-detector → NavigationDetector.setupRouteDetection()
  └─→ settings → Settings.getSettings()
```

## The Subtitle Flow

### Initialization
1. **armVideoFlow()** triggered when navigating to `/watch/` page
2. Detects video element with `VideoDetector.detectVideo()`
3. Polls `PlayerAPIConnector.getPlayerAPI()` until valid watch session obtained
4. Sets up 3 listeners simultaneously:
   - `PlaybackDetector.setupPlaybackDetection()` (pause/play events)
   - `SubtitleFetcher.setupSubtitleFetching()` (TTML requests)
   - `SubtitleDisplay` (ready to show overlay)

### On Pause
1. Get current time from video element: `video.currentTime`
2. Fetch cached additional subtitles: `SubtitleFetcher.getSubtitleCache()[key]`
3. Find text at current time: `SubtitleParser.findCueAt(cues, currentTime)`
4. Show additional overlay: `SubtitleDisplay.showSubtitle(text)`

### On Play
1. Hide additional overlay: `SubtitleDisplay.hideSubtitle()`

## Critical Implementation Details

### Settings Injection (2-part system)
- **settings-injector.js** (runs in ISOLATED world, `document_start`) - reads from `chrome.storage`, writes to DOM
- **settings.js** (runs in MAIN world, `document_end`) - reads from DOM element `#linguaflix-settings`
- This two-world system bypasses content script isolation (ISOLATED can't access MAIN directly)

### Netflix Player API Access
- Netflix exposes `window.nflx?.player?.sessionManager?.state?.PlaybackSession` in MAIN world
- Must retry up to 10 times (Netflix delays player init) - see `player-api-connector.js`
- Session contains: `videoId`, `playerSession`, `sessionId` (used to validate watch context)

### TTML Subtitle Detection
- Netflix CDN URL pattern: `oca.nflxvideo.net/?o=` 
- Uses `PerformanceObserver` to detect completed requests - see `subtitle-fetcher.js`
- Re-fetches TTML from same URL to parse structure

### Fullscreen Handling
- additional overlay must be appended to `document.fullscreenElement` when fullscreen active
- Z-index adjustment: `10000` (normal), `2147483647` (fullscreen) - see `subtitle-display.js`
- **Watches `fullscreenchange` event** to re-parent overlay dynamically

## Code Style & Conventions

### Module Export Pattern
```javascript
// Always use named exports (not default)
export function myFunction() { }  // Good
export default { ... }             // Avoid

// Always include JSDoc with @param, @returns
/**
 * Description of what function does
 * @param {Type} name - Description
 * @returns {Type} Description
 */
```

### Console Logging
- Always prefix with `[LinguaFlix]` for grep-ability
- Use appropriate levels: `debug` (normal), `warn` (recoverable), `error` (critical)
- Example: `console.log('[LinguaFlix] Player session confirmed:', api.sessionId);`

### File Structure
- Module docstring at top (purpose, exports, debug hint via `window.ModuleName`)
- Private state section (private variables)
- Public API section (exported functions)
- Implementation section

## Extension Manifest Details

See `src/manifest.json` for:
- **Two content scripts** running in sequence:
  1. `settings-injector.js` (ISOLATED world, `document_start`) - Early execution, can't access page DOM
  2. `content.js` (MAIN world, `document_end`) - Late execution, can access Netflix APIs
- **Web accessible resources**: `modules/*.js` must be listed so they can be imported
- **Host permissions**: Limited to `https://www.netflix.com/*` only
- **Storage permission**: For user settings persistence

## Key Files Reference

| File | Purpose | Key Functions |
|------|---------|---|
| `src/content.js` | Orchestrator, async init flow | `loadModules()`, `start()`, `armVideoFlow()`, pause/play handlers |
| `src/modules/player-api-connector.js` | Netflix API bridge | `getPlayerAPI()` with retry logic |
| `src/modules/subtitle-fetcher.js` | TTML detection & caching | `setupSubtitleFetching()`, `getSubtitleCache()` |
| `src/manifest.json` | Extension config | Content script order, permissions, resources |
| `src/settings-injector.js` | DOM-based config inject | Must run before content.js |

