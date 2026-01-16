# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LinguaFlix is a Chrome Extension (Manifest V3) that shows secondary subtitles in a chosen language when the Netflix player is paused. Built with vanilla JavaScript (ES6+) using a modular architecture with 8 specialized modules orchestrated by `src/content.js`.

## Development

**No build system or package manager** - the extension uses raw JavaScript loaded directly into the browser.

**To develop locally:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `src/` directory

**Debugging:** VS Code launch config (`.vscode/launch.json`) attaches to Edge on port 9222.

## Architecture

The extension uses **dynamic ES6 imports** instead of static script tags, providing isolated module scopes and debug access via `window.ModuleName`.

### Content Script Execution Order

1. **settings-injector.js** (ISOLATED world, `document_start`) - Reads `chrome.storage.sync`, injects settings into DOM
2. **content.js** (MAIN world, `document_end`) - Orchestrator that loads all modules and handles the subtitle flow

### The 8 Core Modules (`src/modules/`)

| Module | Purpose | Key Export | Lifecycle |
|--------|---------|------------|-----------|
| `video-detector.js` | Find `<video>` element via MutationObserver | `detectVideo(callback)` | Created/destroyed per `/watch/` route |
| `playback-detector.js` | Monitor pause/play events | `setupPlaybackDetection(video, onPause, onPlay)` | Created/destroyed per `/watch/` route |
| `player-api-connector.js` | Access Netflix player session (retries 10x) | `getPlayerAPI()` | Created/destroyed per `/watch/` route |
| `subtitle-fetcher.js` | Detect TTML requests via PerformanceObserver, cache subtitles | `setupSubtitleFetching()`, `getSubtitleCache()` | Created/destroyed per `/watch/` route |
| `subtitle-parser.js` | Parse TTML XML into cue objects | `parseTTML()`, `findCueAt(cues, seconds)` | Stateless utility |
| `subtitle-display.js` | Manage overlay DOM, handle fullscreen | `showSubtitle(text)`, `hideSubtitle()` | Created/destroyed per `/watch/` route |
| `navigation-detector.js` | Detect Netflix SPA navigation | `setupRouteDetection(callback)` | **Singleton - persists for page lifetime** |
| `settings.js` | Read user config from DOM | `getSettings()` | Stateless utility |

**Module dependencies:** Zero cross-module dependencies except SubtitleFetcher which imports SubtitleParser.

**Cleanup pattern:** All modules except `navigation-detector.js` provide a `cleanup()` function called when navigating away from `/watch/`. NavigationDetector persists to detect the next navigation.

### Subtitle Flow

**Initialization:** When navigating to `/watch/`, `armVideoFlow()` detects the video element, polls for Netflix Player API, then sets up playback detection and subtitle fetching.

**On pause:** Get `video.currentTime` -> fetch cached subtitles -> find cue at timestamp -> show overlay.

**On play:** Hide overlay.

### Key Technical Details

**Settings Two-World System:** ISOLATED world scripts can't access MAIN world, so settings are injected via DOM element `#linguaflix-settings`.

**Netflix Player API:** Accessed at `window.nflx?.player?.sessionManager?.state?.PlaybackSession`. Requires retry logic as Netflix delays player init.

**TTML Detection:** PerformanceObserver monitors requests matching `oca.nflxvideo.net/?o=`.

**Fullscreen:** Overlay re-parents to `document.fullscreenElement` with z-index `2147483647`.

## Code Conventions

- Console logs prefixed with `[LinguaFlix]` for grep-ability
- Named exports only (not default exports)
- JSDoc with `@param` and `@returns` on all functions
- Module state is file-scoped (private), exported functions available on `window.[ModuleName]` for debugging
