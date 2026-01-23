import { smsgateways } from '@milemoto/types';
import type { SmsGatewayResponseDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { mapGateway } from './mapper.js';
import { listSmsDeliveryReports } from './deliveryReports.js';

export async function listSmsGateways(): Promise<SmsGatewayResponseDto[]> {
  const rows = await db.select().from(smsgateways);
  return rows.map(mapGateway);
}

export { listSmsDeliveryReports };
