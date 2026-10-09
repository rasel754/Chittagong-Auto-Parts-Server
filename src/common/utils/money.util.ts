/**
 * Financial precision utility for BDT monetary calculations.
 * Ensures consistent 2-decimal-place rounding to prevent IEEE 754 floating-point drift.
 */
export class MoneyUtil {
  /**
   * Rounds a number to exactly 2 decimal places.
   */
  public static round(value: number): number {
    if (isNaN(value) || !isFinite(value)) {
      return 0;
    }
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Calculates Total = Quantity * Unit Rate with exact 2-decimal precision.
   */
  public static multiply(quantity: number, rate: number): number {
    return this.round(quantity * rate);
  }

  /**
   * Safe division with zero denominator handling.
   */
  public static divide(numerator: number, denominator: number): number {
    if (denominator === 0 || isNaN(denominator) || !isFinite(denominator)) {
      return 0;
    }
    return this.round(numerator / denominator);
  }

  /**
   * Weighted Average Cost Calculation:
   * (currentQty * currentAvgCost + incomingQty * incomingCost) / (currentQty + incomingQty)
   */
  public static calculateWeightedAverageCost(
    currentQty: number,
    currentAvgCost: number,
    incomingQty: number,
    incomingCost: number
  ): number {
    const totalQty = currentQty + incomingQty;
    if (totalQty <= 0) {
      return this.round(incomingCost);
    }

    const currentTotalValue = currentQty * currentAvgCost;
    const incomingTotalValue = incomingQty * incomingCost;
    const combinedValue = currentTotalValue + incomingTotalValue;

    return this.round(combinedValue / totalQty);
  }
}
