/**
 * popup.js
 * 
 * Minimalist popup - just a link to full settings page
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load version dynamically from manifest
  const manifest = chrome.runtime.getManifest();
  const versionEl = document.getElementById('versionDisplay');
  if (versionEl) {
    versionEl.textContent = `v${manifest.version}`;
  }

  const settingsBtn = document.getElementById('settingsBtn');

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      // Open options page using the proper API
      chrome.runtime.openOptionsPage();
    });
  }
});