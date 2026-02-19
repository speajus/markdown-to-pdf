/**
 * Emoji detection and text segmentation utilities.
 *
 * Splits a string into runs of "emoji" vs "non-emoji" characters so the
 * renderer can switch to an emoji font (e.g. Noto Emoji) for glyph coverage.
 */

export interface TextSegment {
  text: string;
  isEmoji: boolean;
}

/**
 * Regex that matches a single emoji "unit".
 *
 * Covers:
 *  - Emoji presentation sequences  (base + U+FE0F)
 *  - Keycap sequences              (digit + U+FE0F + U+20E3)
 *  - Flag sequences                (regional indicators)
 *  - ZWJ sequences                 (family, profession, etc.)
 *  - Tag sequences                 (e.g. England flag)
 *  - Modifier sequences            (skin-tone)
 *  - Standalone emoji codepoints   in Emoticons, Dingbats, Symbols, etc.
 *
 * We use a wide net via Unicode property escapes where the runtime supports
 * them, falling back to explicit ranges for broad compatibility.
 */
const EMOJI_RE = buildEmojiRegex();

function buildEmojiRegex(): RegExp {
  // Modern runtimes (Node 10+) support Unicode property escapes.
  // We try that first because it is maintained by the Unicode consortium
  // and stays current with new emoji releases.
  try {
    // \p{Emoji_Presentation} — characters rendered as emoji by default
    // \p{Emoji_Modifier_Base} — characters that accept skin-tone modifiers
    // The rest handles ZWJ, keycap, flag, and tag sequences.
    return new RegExp(
      '(?:' +
        // ZWJ sequences (family, professions, etc.)
        '(?:\\p{Emoji_Presentation}|\\p{Emoji_Modifier_Base})' +
        '(?:\\p{Emoji_Modifier})?' +
        '(?:\\u200D(?:\\p{Emoji_Presentation}|\\p{Emoji_Modifier_Base})(?:\\p{Emoji_Modifier})?)*)' +
      '|' +
        // Keycap sequences: digit/# /* + VS16 + combining enclosing keycap
        '[0-9#*]\\uFE0F?\\u20E3' +
      '|' +
        // Regional indicator flag pairs
        '(?:[\\u{1F1E6}-\\u{1F1FF}]){2}' +
      '|' +
        // Tag sequences (e.g. flag of England)
        '\\u{1F3F4}[\\u{E0060}-\\u{E007E}]+\\u{E007F}' +
      '|' +
        // Standalone emoji with optional VS16
        '[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2300}-\\u{23FF}\\u{2B50}\\u{2B55}\\u{FE00}-\\u{FE0F}\\u{200D}]\\uFE0F?' +
      '',
      'gu',
    );
  } catch {
    // Fallback: cover the most common emoji ranges without property escapes.
    return new RegExp(
      '[' +
        '\\u{1F600}-\\u{1F64F}' + // Emoticons
        '\\u{1F300}-\\u{1F5FF}' + // Misc Symbols & Pictographs
        '\\u{1F680}-\\u{1F6FF}' + // Transport & Map
        '\\u{1F900}-\\u{1F9FF}' + // Supplemental Symbols
        '\\u{1FA00}-\\u{1FA6F}' + // Chess Symbols
        '\\u{1FA70}-\\u{1FAFF}' + // Symbols Extended-A
        '\\u{2600}-\\u{26FF}'   + // Misc Symbols
        '\\u{2700}-\\u{27BF}'   + // Dingbats
        '\\u{FE00}-\\u{FE0F}'  + // Variation Selectors
        '\\u{200D}'             + // ZWJ
        '\\u{1F1E6}-\\u{1F1FF}' + // Regional Indicators
        ']+',
      'gu',
    );
  }
}

/**
 * Returns `true` when the whole string is emoji (one or more).
 */
export function isEmoji(text: string): boolean {
  const stripped = text.replace(EMOJI_RE, '');
  return stripped.trim().length === 0 && text.length > 0;
}

/**
 * Split `text` into contiguous runs of emoji and non-emoji characters.
 *
 * Example:
 *   splitEmojiSegments("Hello 🎉🔥 world")
 *   => [
 *        { text: "Hello ", isEmoji: false },
 *        { text: "🎉🔥", isEmoji: true },
 *        { text: " world", isEmoji: false },
 *      ]
 */
export function splitEmojiSegments(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // Reset global regex state
  EMOJI_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = EMOJI_RE.exec(text)) !== null) {
    // Push any non-emoji text before this match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isEmoji: false });
    }

    // Merge consecutive emoji matches into one segment
    const prev = segments[segments.length - 1];
    if (prev && prev.isEmoji) {
      prev.text += match[0];
    } else {
      segments.push({ text: match[0], isEmoji: true });
    }

    lastIndex = EMOJI_RE.lastIndex;
  }

  // Trailing non-emoji text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isEmoji: false });
  }

  return segments;
}

/**
 * Quick check: does the string contain at least one emoji?
 */
export function containsEmoji(text: string): boolean {
  EMOJI_RE.lastIndex = 0;
  return EMOJI_RE.test(text);
}

