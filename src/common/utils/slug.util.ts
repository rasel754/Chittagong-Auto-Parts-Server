export class SlugUtil {
  /**
   * Normalizes code/slug to lower-case alphanumeric with hyphens
   */
  public static create(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
