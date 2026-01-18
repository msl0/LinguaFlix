/**
 * settings.js
 * 
 * Settings module for LinguaFlix (MAIN world version)
 * Reads settings from DOM element with id 'linguaflix-settings' (injected by settings-injector.js)
 * 
 * Exports: { getSettings, getSetting }
 */

const DEFAULT_SETTINGS = {
  overlayLanguage: 'pl',           // Default: Polish
  preferClosedCaptions: false,     // Default: prefer regular subtitles
  enabled: true                    // Future: global on/off toggle
};

/**
 * getSettings()
 * Returns settings injected by settings-injector.js via DOM
 * 
 * @returns {Promise<Object>} Settings object with defaults
 */
export async function getSettings() {
  try {
    const settingsEl = document.getElementById('linguaflix-settings');
    
    if (settingsEl) {
      const settingsJson = settingsEl.dataset.settings;
      if (settingsJson) {
        const injectedSettings = JSON.parse(settingsJson);
        console.log('[LinguaFlix Settings] Using injected settings:', injectedSettings);
        return { ...DEFAULT_SETTINGS, ...injectedSettings };
      }
    }
    
    console.warn('[LinguaFlix Settings] No injected settings found, using defaults');
    return DEFAULT_SETTINGS;
  } catch (err) {
    console.error('[LinguaFlix Settings] Exception loading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * getSetting(key)
 * Gets single setting value
 * 
 * @param {string} key - Setting key (e.g., 'overlayLanguage')
 * @returns {Promise<any>} Setting value
 */
export async function getSetting(key) {
  const settings = await getSettings();
  return settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
}

console.log('[LinguaFlix] settings.js loaded');
