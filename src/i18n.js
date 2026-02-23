/**
 * i18n.js
 *
 * Translates HTML elements using Chrome's i18n API.
 * Elements with [data-i18n] get their textContent replaced.
 * Elements with [data-i18n-title] get their title attribute replaced.
 */

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = chrome.i18n.getUILanguage();

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const msg = chrome.i18n.getMessage(el.dataset.i18nTitle);
    if (msg) el.title = msg;
  });
});
