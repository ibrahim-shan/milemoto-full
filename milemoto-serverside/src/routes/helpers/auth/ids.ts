export function toUserId(userId: string): number {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid user id');
  }
  return id;
}
