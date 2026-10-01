/**
 * formatters.ts
 * Centralized formatting helpers for prices, percentages, and financial values.
 * Guarantees proper thousands separators (commas) across all numbers and currencies.
 */

/**
 * Formats a cryptocurrency price with proper decimals and thousands separators (commas).
 * Examples:
 * - 84102.55 -> "$84,102.55"
 * - 2691.50  -> "$2,691.50"
 * - 179.84   -> "$179.84"
 * - 0.4285   -> "$0.4285"
 * - 0.000045 -> "$0.000045"
 */
export function formatCoinPrice(price: number | string | undefined | null): string {
  if (price === undefined || price === null || price === '') return '$0.00';
  const num = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.-]/g, '')) : price;
  if (isNaN(num) || num === 0) return '$0.00';
  if (num < 0.00000001) return `$${num.toFixed(10)}`;
  if (num < 0.0001) return `$${num.toFixed(8)}`;
  if (num < 0.01) return `$${num.toFixed(6)}`;
  if (num < 1) return `$${num.toFixed(4)}`;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats raw numeric price without '$' prefix, but with proper commas if >= 1000.
 * Examples:
 * - 84102.55 -> "84,102.55"
 * - 2691.50  -> "2,691.50"
 */
export function formatRawPrice(price: number | string | undefined | null): string {
  if (price === undefined || price === null || price === '') return '0.00';
  const num = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.-]/g, '')) : price;
  if (isNaN(num) || num === 0) return '0.00';
  if (num < 0.00000001) return num.toFixed(10);
  if (num < 0.0001) return num.toFixed(8);
  if (num < 0.01) return num.toFixed(6);
  if (num < 1) return num.toFixed(4);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formats percentage change with sign (+/-) and thousands separators (commas).
 * Examples:
 * - 77086.42      -> "+77,086.42%"
 * - "+77086.42%"  -> "+77,086.42%"
 * - 0.38          -> "+0.38%"
 * - 0.49          -> "+0.49%"
 * - -14.25        -> "-14.25%"
 * - -1240.50      -> "-1,240.50%"
 */
export function formatPercentage(pct: number | string | undefined | null): string {
  if (pct === undefined || pct === null || pct === '') return '+0.00%';
  let num: number;
  let forcedSign: string | null = null;

  if (typeof pct === 'string') {
    const trimmed = pct.trim();
    if (trimmed.startsWith('-')) forcedSign = '-';
    else if (trimmed.startsWith('+')) forcedSign = '+';
    num = parseFloat(trimmed.replace(/[+%,]/g, ''));
  } else {
    num = pct;
  }

  if (isNaN(num)) return '+0.00%';
  const sign = forcedSign ? forcedSign : (num > 0 ? '+' : num < 0 ? '-' : '+');
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${formatted}%`;
}

/**
 * Formats USD balance or value with commas.
 * Examples:
 * - 1336.72 -> "$1,336.72"
 * - 84102.5 -> "$84,102.50"
 */
export function formatUsdAmount(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '$0.00';
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : val;
  if (isNaN(num)) return '$0.00';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
