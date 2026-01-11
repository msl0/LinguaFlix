/**
 * background.js
 * 
 * Service Worker for LinguaFlix
 * Handles extension installation and opens settings page
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Open settings page on first install
    chrome.tabs.create({ url: 'options.html' });
    console.log('[LinguaFlix] Extension installed. Opening settings page...');
  }
});
