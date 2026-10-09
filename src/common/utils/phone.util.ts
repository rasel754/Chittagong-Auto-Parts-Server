/**
 * Bangladeshi phone number normalization and validation utility.
 * Standard format: 11 digits starting with '01' (e.g., 01811000000, 01712345678).
 */
export class PhoneUtil {
  /**
   * Normalizes a phone number to standard 11-digit Bangladeshi format (01XXXXXXXXX).
   * Strips all non-digit characters, spaces, hyphens, and leading +88 or 88.
   */
  public static normalize(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Strip leading 880 if present
    if (cleaned.startsWith('880') && cleaned.length === 13) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('88') && cleaned.length === 13) {
      cleaned = cleaned.substring(2);
    }

    return cleaned;
  }

  /**
   * Validates if a normalized phone number is a valid 11-digit Bangladeshi mobile number.
   * Operator prefixes: 013, 014, 015, 016, 017, 018, 019.
   */
  public static isValid(phone: string): boolean {
    const normalized = this.normalize(phone);
    // 11 digits starting with 01 followed by 3-9 and 8 more digits
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    return bdPhoneRegex.test(normalized);
  }
}
