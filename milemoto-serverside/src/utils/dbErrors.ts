export enum MySqlErrorCode {
  DuplicateEntry = 'ER_DUP_ENTRY',
  ForeignKeyConstraint = 'ER_NO_REFERENCED_ROW_2',
  RowIsReferenced = 'ER_ROW_IS_REFERENCED_2',
}

type MySqlError = {
  code?: string;
  message?: string;
};

function asMySqlError(error: unknown): MySqlError | null {
  if (!error || typeof error !== 'object') return null;
  if ('code' in error) {
    return error as MySqlError;
  }
  if ('cause' in error) {
    return asMySqlError((error as { cause?: unknown }).cause);
  }
  if ('error' in error) {
    return asMySqlError((error as { error?: unknown }).error);
  }
  return null;
}

export function getMySqlErrorCode(error: unknown): MySqlErrorCode | undefined {
  const mysqlError = asMySqlError(error);
  if (!mysqlError?.code) return undefined;
  const code = mysqlError.code as MySqlErrorCode;
  if (Object.values(MySqlErrorCode).includes(code)) {
    return code;
  }
  return undefined;
}

export function isMySqlError(
  error: unknown,
  ...codes: MySqlErrorCode[]
): error is MySqlError & Error {
  const code = getMySqlErrorCode(error);
  if (!code) return false;
  if (codes.length === 0) return true;
  return codes.includes(code);
}

export function isDuplicateEntryError(error: unknown): boolean {
  return isMySqlError(error, MySqlErrorCode.DuplicateEntry);
}

export function isForeignKeyConstraintError(error: unknown): boolean {
  return isMySqlError(error, MySqlErrorCode.ForeignKeyConstraint);
}

export function isRowIsReferencedError(error: unknown): boolean {
  return isMySqlError(error, MySqlErrorCode.RowIsReferenced);
}
