/**
 * Format a number with currency symbol and position
 * @param amount - The numeric amount
 * @param symbol - Currency symbol (e.g., "$", "€", "£")
 * @param position - Position of symbol ("before" or "after")
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  symbol: string = '$',
  position: 'before' | 'after' = 'before',
  decimals: number = 2,
): string {
  const formattedAmount = amount.toFixed(decimals);

  if (position === 'after') {
    return `${formattedAmount} ${symbol}`;
  }

  return `${symbol} ${formattedAmount}`;
}
