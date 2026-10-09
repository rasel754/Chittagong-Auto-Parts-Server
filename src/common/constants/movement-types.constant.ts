export const MovementType = {
  STOCK_IN: 'STOCK_IN',
  SALE: 'SALE',
  ADJUSTMENT: 'ADJUSTMENT',
  RETURN: 'RETURN'
} as const;

export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export const ReferenceType = {
  STOCK_ENTRY: 'STOCK_ENTRY',
  SALE: 'SALE',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT'
} as const;

export type ReferenceType = (typeof ReferenceType)[keyof typeof ReferenceType];
