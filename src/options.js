/**
 * options.js
 * 
 * Full settings page logic
 * Handles loading and saving extension settings
 */

const DEFAULT_SETTINGS = {
  overlayLanguage: 'pl',
  preferClosedCaptions: false
};

// Load settings when page opens
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await loadSettings();

    // Populate UI with current settings
    const languageSelect = document.getElementById('overlayLanguage');
    languageSelect.value = settings.overlayLanguage ?? DEFAULT_SETTINGS.overlayLanguage;

    const ccCheckbox = document.getElementById('preferClosedCaptions');
    ccCheckbox.checked = settings.preferClosedCaptions ?? DEFAULT_SETTINGS.preferClosedCaptions;

    console.log('[LinguaFlix Settings] Settings loaded:', settings);
  } catch (err) {
    console.error('[LinguaFlix Settings] Error loading settings:', err);
    showStatus('Error loading settings', 'error');
  }
});

// Save button click handler
document.getElementById('saveBtn').addEventListener('click', async () => {
  try {
    const languageSelect = document.getElementById('overlayLanguage');
    const ccCheckbox = document.getElementById('preferClosedCaptions');
    
    const overlayLanguage = languageSelect.value;
    const preferClosedCaptions = ccCheckbox.checked;
    
    // Validate
    if (!overlayLanguage) {
      showStatus('Please select a language', 'error');
      return;
    }
    
    // Save to chrome.storage.sync
    await saveSettings({ overlayLanguage, preferClosedCaptions });
    
    showStatus('✓ Settings saved! Reload Netflix to apply changes.', 'success');
    console.log('[LinguaFlix Settings] Settings saved:', { overlayLanguage, preferClosedCaptions });
  } catch (err) {
    console.error('[LinguaFlix Settings] Error saving settings:', err);
    showStatus('✗ Error saving settings', 'error');
  }
});

// Reset button click handler
document.getElementById('resetBtn').addEventListener('click', async () => {
  try {
    const languageSelect = document.getElementById('overlayLanguage');
    const ccCheckbox = document.getElementById('preferClosedCaptions');

    // Reset to default
    await saveSettings(DEFAULT_SETTINGS);

    // Update UI
    languageSelect.value = DEFAULT_SETTINGS.overlayLanguage;
    ccCheckbox.checked = DEFAULT_SETTINGS.preferClosedCaptions;

    showStatus('✓ Reset to default', 'success');
    console.log('[LinguaFlix Settings] Settings reset:', DEFAULT_SETTINGS);
  } catch (err) {
    console.error('[LinguaFlix Settings] Error resetting settings:', err);
    showStatus('✗ Error resetting settings', 'error');
  }
});

/**
 * Load settings from chrome.storage.sync
 * @returns {Promise<Object>} Settings object
 */
async function loadSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Save settings to chrome.storage.sync
 * @param {Object} settings - Settings to save
 * @returns {Promise<void>}
 */
async function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Show status message to user
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = `status ${type} show`;
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}
