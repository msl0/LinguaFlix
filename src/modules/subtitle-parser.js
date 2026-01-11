/**
 * subtitle-parser.js
 * 
 * Parse TTML XML from Netflix CDN into cue objects
 * Time conversion from ticks to milliseconds
 * Find cue at given timestamp
 * 
 * Public API:
 * - parseTTML(xmlString) → {cues: [...], language: string}
 * - findCueAt(timeMs, cues) → {text, start, end} | null
 */

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parsuje TTML XML do tablicy cue objects
 * @param {string} xmlString - XML z Netflix CDN
 * @returns {{cues: Array, language: string}} - Parsed cues + language
 */
function parseTTML(xmlString) {
  const result = { cues: [], language: null };

  if (!xmlString || typeof xmlString !== 'string') {
    console.warn('[LinguaFlix] parseTTML: Empty or invalid XML string');
    return result;
  }

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    // Check for parsing errors
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      console.error('[LinguaFlix] XML parsing error');
      return result;
    }

    // Extract language from root element
    const rootElement = xmlDoc.documentElement;
    const xmlLang = rootElement.getAttribute('xml:lang');
    if (xmlLang) {
      result.language = xmlLang === 'en' ? 'en-US' : xmlLang;
    }

    // Extract tickRate for time conversion
    const tickRateAttr = rootElement.getAttribute('ttp:tickRate');
    const tickRate = tickRateAttr ? parseInt(tickRateAttr, 10) : 10000000;

    // Find all <p> elements (Netflix TTML structure)
    const pElements = xmlDoc.querySelectorAll('body p');
    if (pElements.length === 0) {
      console.warn('[LinguaFlix] No <p> elements found in TTML');
      return result;
    }

    // Parse each <p> element into a cue
    for (const p of pElements) {
      const begin = p.getAttribute('begin');
      const end = p.getAttribute('end');
      const text = extractCueText(p);

      if (!begin || !end) continue;

      const startMs = timeToMs(begin, tickRate);
      const endMs = timeToMs(end, tickRate);

      if (text) {
        result.cues.push({
          text,
          start: startMs,
          end: endMs
        });
      }
    }

    // Sort cues by start time
    result.cues.sort((a, b) => a.start - b.start);

    // ❌ USUNIĘTE (linie 367-368 z oryginału):
    // window.extensionState.subtitleCache = {};
    // Parser nie powinien zarządzać cache - to odpowiedzialność subtitle-fetcher.js

    const multilineCount = result.cues.reduce((acc, c) => 
      acc + (c.text && c.text.includes('\n') ? 1 : 0), 0);
    console.log('[LinguaFlix] Parsed TTML: language=' + result.language + 
                ', cues=' + result.cues.length + 
                ', multiline cues=' + multilineCount);
    return result;
  } catch (err) {
    console.error('[LinguaFlix] Error parsing TTML:', err);
    return result;
  }
}

/**
 * Znajduje cue dla danego timestamp
 * @param {number} timeMs - Czas w milliseconds
 * @param {Array} cues - Tablica cue objects (sorted by start)
 * @returns {Object|null} - Cue object lub null
 */
function findCueAt(timeMs, cues) {
  if (!Array.isArray(cues) || !cues.length) return null;
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (timeMs >= c.start && timeMs < c.end) return c;
    if (timeMs < c.start) break; // cues sorted, early exit
  }
  return null;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Konwertuje TTML time format (ticks) → milliseconds
 * @private
 */
function timeToMs(timeStr, tickRate = 10000000) {
  if (!timeStr || typeof timeStr !== 'string') return 0;

  // Handle tick format: "513429584t" (Netflix native format)
  if (timeStr.endsWith('t')) {
    const ticks = parseInt(timeStr.slice(0, -1), 10);
    if (!isNaN(ticks)) {
      return Math.round((ticks / tickRate) * 1000);
    }
  }

  return 0;
}

/**
 * Ekstraktuje tekst z TTML <p>, zachowując <br/> jako \n
 * @private
 */
function extractCueText(node) {
  try {
    if (!node) return '';

    // Walk the XML DOM to preserve <br/> as newlines and gather text nodes
    const parts = [];
    (function walk(n) {
      const ELEMENT_NODE = 1;
      const TEXT_NODE = 3;

      if (!n) return;
      if (n.nodeType === TEXT_NODE) {
        parts.push(n.nodeValue || '');
        return;
      }
      if (n.nodeType === ELEMENT_NODE) {
        const tag = (n.tagName || '').toLowerCase();
        if (tag === 'br') {
          parts.push('\n');
        }
        const children = n.childNodes || [];
        for (let i = 0; i < children.length; i++) {
          walk(children[i]);
        }
      }
    })(node);

    // Join and normalize without removing newlines
    let text = parts.join('');
    text = text.replace(/\r/g, '');
    text = text.replace(/[ \t\u00A0]+/g, ' ');
    text = text.replace(/[ \t]*\n[ \t]*/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    return text;
  } catch (err) {
    console.error('[LinguaFlix] Error extracting cue text:', err);
    return '';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { parseTTML, findCueAt };

console.log('[LinguaFlix] subtitle-parser.js loaded');
