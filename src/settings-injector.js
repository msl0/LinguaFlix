/**
 * settings-injector.js
 * 
 * Runs in ISOLATED world (has access to chrome.storage)
 * Loads settings and injects them into DOM for MAIN world script to read
 * Uses data-attribute approach to avoid CSP violations
 */

(async () => {
  try {
    // Load settings from chrome.storage.sync
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get({ 
        overlayLanguage: 'pl',
        preferClosedCaptions: false
      }, (result) => {
        resolve(result);
      });
    });
    
    console.log('[LinguaFlix] Settings loaded from chrome.storage:', settings);
    
    // Inject settings into DOM as data-attribute (avoids CSP inline-script violation)
    const settingsEl = document.createElement('div');
    settingsEl.id = 'linguaflix-settings';
    settingsEl.setAttribute('data-settings', JSON.stringify(settings));
    settingsEl.style.display = 'none';
    document.documentElement.appendChild(settingsEl);
    
    console.log('[LinguaFlix] Settings injected into DOM');
  } catch (err) {
    console.error('[LinguaFlix] Error:', err);
    // Inject defaults on error
    const settingsEl = document.createElement('div');
    settingsEl.id = 'linguaflix-settings';
    settingsEl.setAttribute('data-settings', JSON.stringify({ overlayLanguage: 'pl', preferClosedCaptions: false }));
    settingsEl.style.display = 'none';
    document.documentElement.appendChild(settingsEl);
  }
})();
