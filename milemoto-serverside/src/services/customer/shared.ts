import { users } from '@milemoto/types';

type UserRow = typeof users.$inferSelect;

export function formatCustomerRow(row: UserRow) {
  return {
    id: String(row.id),
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    emailVerifiedAt: row.emailVerifiedAt
      ? row.emailVerifiedAt instanceof Date
        ? row.emailVerifiedAt.toISOString()
        : String(row.emailVerifiedAt)
      : null,
  };
}
