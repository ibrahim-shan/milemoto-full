import { eq } from 'drizzle-orm';
import { goodsreceipts } from '@milemoto/types';
import { db } from '../../db/drizzle.js';

export async function generateGrnNumber(tx: typeof db): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  let counter = 1;

  while (true) {
    const candidate = `GRN-${year}-${String(counter).padStart(6, '0')}`;
    const [existing] = await tx
      .select({ id: goodsreceipts.id })
      .from(goodsreceipts)
      .where(eq(goodsreceipts.grnNumber, candidate))
      .limit(1);
    if (!existing) return candidate;
    counter += 1;
  }
}
