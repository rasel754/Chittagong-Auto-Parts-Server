export class RegexUtil {
  /**
   * Escapes special regex characters in a query string so it can safely be used in a RegExp
   */
  public static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Normalizes Unicode text (NFC) and strips invisible zero-width characters
   * commonly introduced by Bangla keyboards and IME (Avro, Bijoy, Mobile)
   */
  public static normalizeSearchText(str: string): string {
    return str.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  }

  /**
   * Creates a case-insensitive RegExp from a user query string with special characters escaped.
   * Supports multi-word mixed queries (e.g. Bangla & English tokens) in any order using lookaheads.
   */
  public static createCaseInsensitiveSearchRegex(search: string): RegExp {
    const cleaned = this.normalizeSearchText(search);
    if (!cleaned) {
      return new RegExp('', 'i');
    }
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length <= 1) {
      return new RegExp(this.escapeRegex(cleaned), 'i');
    }
    const pattern = tokens.map((token) => `(?=.*${this.escapeRegex(token)})`).join('');
    return new RegExp(pattern, 'i');
  }
}

