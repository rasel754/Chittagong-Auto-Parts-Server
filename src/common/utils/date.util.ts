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

    if (customStart && customEnd) {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        return {
          startDate: s,
          endDate: e
        };
      }
    }

    if (!period) {
      return null;
    }

    switch (period.toLowerCase()) {
      case 'today': {
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setUTCHours(23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }
      case 'yesterday': {
        const start = new Date(now);
        start.setUTCDate(start.getUTCDate() - 1);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setUTCDate(end.getUTCDate() - 1);
        end.setUTCHours(23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }
      case '7d':
      case 'last_7_days': {
        const start = new Date(now);
        start.setUTCDate(start.getUTCDate() - 6);
        start.setUTCHours(0, 0, 0, 0);
        return { startDate: start, endDate: now };
      }
      case '30d':
      case 'last_30_days': {
        const start = new Date(now);
        start.setUTCDate(start.getUTCDate() - 29);
        start.setUTCHours(0, 0, 0, 0);
        return { startDate: start, endDate: now };
      }
      case 'this_month': {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        return { startDate: start, endDate: now };
      }
      case 'last_month': {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
        return { startDate: start, endDate: end };
      }
      default:
        return null;
    }
  }
}
