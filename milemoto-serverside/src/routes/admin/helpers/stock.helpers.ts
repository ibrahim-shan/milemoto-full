import {
  StockAdjustmentInput as AdjustmentInput,
  StockLevelListQuery,
  StockMovementListQuery as MovementListQuery,
  StockTransferInput as TransferInput,
  type CreateStockAdjustmentDto as AdjustmentInputDto,
  type CreateStockTransferDto as TransferInputDto,
  type StockMovementListQueryDto as StockMovementListQueryDto,
} from '@milemoto/types';
import { z } from 'zod';

const QueryBoolean = z.preprocess(
  (value) => (typeof value === 'boolean' ? String(value) : value),
  z.enum(['true', 'false']).transform((value) => value === 'true')
);

export const LevelListQuery = StockLevelListQuery.extend({
  brandId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  subCategoryId: z.coerce.number().int().positive().optional(),
  lowStockOnly: QueryBoolean.optional(),
  outOfStockOnly: QueryBoolean.optional(),
  allocatedOnly: QueryBoolean.optional(),
  onOrderOnly: QueryBoolean.optional(),
  filterMode: z.enum(['all', 'any']).optional(),
});

export type StockLevelListQueryDto = z.infer<typeof LevelListQuery>;

export {
  MovementListQuery,
  type StockMovementListQueryDto,
  AdjustmentInput,
  type AdjustmentInputDto,
  TransferInput,
  type TransferInputDto,
};
