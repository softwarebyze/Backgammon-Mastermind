/** U+2011 NON-BREAKING HYPHEN — Inter ships a glyph for it. */
const NON_BREAKING_HYPHEN = '\u2011';

/**
 * Keep hyphenated words ("re-enter", "6-point", "2-2") on one line. Lines may
 * still break at spaces; only a hyphen between two non-space characters is
 * swapped, so dashes used as punctuation (" - ") are left alone.
 */
export function noBreakHyphens(text: string): string {
  return text.replace(/(\S)-(?=\S)/g, `$1${NON_BREAKING_HYPHEN}`);
}
