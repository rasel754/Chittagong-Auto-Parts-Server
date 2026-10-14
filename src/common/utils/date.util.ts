export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class DateUtil {
  /**
   * Resolves preset reporting periods or custom ISO date strings into exact start/end Dates.
   * Default timezone context: Asia/Dhaka (+06:00).
   */
  public static parseReportingPeriod(
    period?: string,
    customStart?: string,
    customEnd?: string
  ): DateRange | null {
    const now = new Date();

    if (customStart || customEnd) {
      const s = customStart ? new Date(customStart) : new Date(0);
      const e = customEnd ? new Date(customEnd) : new Date();
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        return {
          startDate: s,
          endDate: e
        };
      }
    }

    if (!period || period.toLowerCase() === 'all_time' || period.toLowerCase() === 'custom') {
      return null;
    }

    // Default timezone context: Asia/Dhaka (+06:00)
    const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
    const dhakaNow = new Date(now.getTime() + DHAKA_OFFSET_MS);
    const y = dhakaNow.getUTCFullYear();
    const m = dhakaNow.getUTCMonth();
    const d = dhakaNow.getUTCDate();

    switch (period.toLowerCase()) {
      case 'today': {
        const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - DHAKA_OFFSET_MS);
        const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - DHAKA_OFFSET_MS);
        return { startDate: start, endDate: end };
      }
      case 'yesterday': {
        const start = new Date(Date.UTC(y, m, d - 1, 0, 0, 0, 0) - DHAKA_OFFSET_MS);
        const end = new Date(Date.UTC(y, m, d - 1, 23, 59, 59, 999) - DHAKA_OFFSET_MS);
        return { startDate: start, endDate: end };
      }
      case '7d':
      case 'last_7_days': {
        const start = new Date(Date.UTC(y, m, d - 6, 0, 0, 0, 0) - DHAKA_OFFSET_MS);
        return { startDate: start, endDate: now };
      }
      case '30d':
      case 'last_30_days': {
        const start = new Date(Date.UTC(y, m, d - 29, 0, 0, 0, 0) - DHAKA_OFFSET_MS);
        return { startDate: start, endDate: now };
      }
      case 'this_month': {
        const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - DHAKA_OFFSET_MS);
        const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - DHAKA_OFFSET_MS);
        return { startDate: start, endDate: end };
      }
      case 'last_month': {
        const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0) - DHAKA_OFFSET_MS);
        const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999) - DHAKA_OFFSET_MS);
        return { startDate: start, endDate: end };
      }
      default:
        return null;
    }
  }
}
