export const UserRole = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF'
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
