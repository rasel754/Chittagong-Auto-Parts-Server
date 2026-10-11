export class RegexUtil {
  /**
   * Escapes special regex characters in a query string so it can safely be used in a RegExp
   */
  public static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Creates a case-insensitive RegExp from a user query string with special characters escaped
   */
  public static createCaseInsensitiveSearchRegex(search: string): RegExp {
    return new RegExp(this.escapeRegex(search.trim()), 'i');
  }
}
