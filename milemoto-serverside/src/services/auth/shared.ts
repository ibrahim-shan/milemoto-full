import { httpError } from '../../utils/error.js';

export function toUserId(userId: string): number {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    throw httpError(400, 'InvalidUserId', 'Invalid user id');
  }
  return id;
}
