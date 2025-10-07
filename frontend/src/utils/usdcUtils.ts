/**
 * USDC utility functions for price conversion and formatting
 */

// USDC has 6 decimal places
export const USDC_DECIMALS = 6;
export const USDC_MULTIPLIER = Math.pow(10, USDC_DECIMALS);

// SOL has 9 decimal places  
export const SOL_DECIMALS = 9;
export const SOL_MULTIPLIER = Math.pow(10, SOL_DECIMALS);

/**
 * Convert USDC amount to lamports (for Solana transactions)
 * @param usdcAmount - Amount in USDC (e.g., 10.50 for $10.50)
 * @returns Amount in lamports
 */
export function usdcToLamports(usdcAmount: number): number {
  return Math.floor(usdcAmount * USDC_MULTIPLIER);
}

/**
 * Convert lamports to USDC amount
 * @param lamports - Amount in lamports
 * @returns Amount in USDC
 */
export function lamportsToUsdc(lamports: number): number {
  return lamports / USDC_MULTIPLIER;
}

/**
 * Convert USDC to SOL (approximate, based on current market rate)
 * This would typically fetch from a price API in production
 * @param usdcAmount - Amount in USDC
 * @param solPriceUsd - Current SOL price in USD (default: $100)
 * @returns Amount in SOL
 */
export function usdcToSol(usdcAmount: number, solPriceUsd: number = 100): number {
  return usdcAmount / solPriceUsd;
}

/**
 * Convert SOL to USDC (approximate, based on current market rate)
 * @param solAmount - Amount in SOL
 * @param solPriceUsd - Current SOL price in USD (default: $100)
 * @returns Amount in USDC
 */
export function solToUsdc(solAmount: number, solPriceUsd: number = 100): number {
  return solAmount * solPriceUsd;
}

/**
 * Format USDC amount for display
 * @param usdcAmount - Amount in USDC
 * @param showSymbol - Whether to show the $ symbol
 * @returns Formatted string
 */
export function formatUsdc(usdcAmount: number, showSymbol: boolean = true): string {
  const formatted = usdcAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return showSymbol ? `$${formatted}` : formatted;
}

/**
 * Format USDC amount with compact notation for large amounts
 * @param usdcAmount - Amount in USDC
 * @param showSymbol - Whether to show the $ symbol
 * @returns Formatted string (e.g., "$1.2K", "$5.6M")
 */
export function formatUsdcCompact(usdcAmount: number, showSymbol: boolean = true): string {
  const absAmount = Math.abs(usdcAmount);
  
  if (absAmount >= 1000000) {
    const formatted = (usdcAmount / 1000000).toFixed(1);
    return showSymbol ? `$${formatted}M` : `${formatted}M`;
  } else if (absAmount >= 1000) {
    const formatted = (usdcAmount / 1000).toFixed(1);
    return showSymbol ? `$${formatted}K` : `${formatted}K`;
  } else {
    return formatUsdc(usdcAmount, showSymbol);
  }
}

/**
 * Parse USDC input string to number
 * Handles various formats: "$10.50", "10.50", "10,50", etc.
 * @param input - Input string
 * @returns Parsed number or NaN if invalid
 */
export function parseUsdcInput(input: string): number {
  if (!input || input.trim() === '') return NaN;
  
  // Remove currency symbols and extra spaces
  const cleaned = input.replace(/[$,\s]/g, '');
  
  // Handle different decimal separators
  const normalized = cleaned.replace(',', '.');
  
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? NaN : parsed;
}

/**
 * Validate USDC amount
 * @param amount - Amount to validate
 * @param minAmount - Minimum allowed amount (default: 0.01)
 * @param maxAmount - Maximum allowed amount (default: 1000000)
 * @returns Validation result
 */
export function validateUsdcAmount(
  amount: number, 
  minAmount: number = 0.01, 
  maxAmount: number = 1000000
): { isValid: boolean; error?: string } {
  if (isNaN(amount)) {
    return { isValid: false, error: 'Invalid amount' };
  }
  
  if (amount < minAmount) {
    return { isValid: false, error: `Minimum amount is ${formatUsdc(minAmount)}` };
  }
  
  if (amount > maxAmount) {
    return { isValid: false, error: `Maximum amount is ${formatUsdc(maxAmount)}` };
  }
  
  return { isValid: true };
}

/**
 * Get current SOL price in USD (mock implementation)
 * In production, this would fetch from a real price API
 * @returns Promise<number> - SOL price in USD
 */
export async function getSolPriceUsd(): Promise<number> {
  try {
    // In production, you would fetch from a real API like CoinGecko, Jupiter, etc.
    // For now, return a mock price
    return 100; // Mock SOL price
  } catch (error) {
    console.error('Failed to fetch SOL price:', error);
    return 100; // Fallback price
  }
}

/**
 * Convert USDC to lamports with current SOL price
 * @param usdcAmount - Amount in USDC
 * @returns Promise<number> - Amount in lamports
 */
export async function usdcToLamportsWithPrice(usdcAmount: number): Promise<number> {
  const solPrice = await getSolPriceUsd();
  const solAmount = usdcToSol(usdcAmount, solPrice);
  return Math.floor(solAmount * SOL_MULTIPLIER);
}

/**
 * Price display component props
 */
export interface PriceDisplayProps {
  amount: number;
  currency: 'USDC' | 'SOL';
  showSymbol?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Format price for display based on currency
 * @param props - Price display props
 * @returns Formatted price string
 */
export function formatPrice({ amount, currency, showSymbol = true, compact = false }: PriceDisplayProps): string {
  if (currency === 'USDC') {
    return compact ? formatUsdcCompact(amount, showSymbol) : formatUsdc(amount, showSymbol);
  } else {
    // SOL formatting
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    return showSymbol ? `${formatted} SOL` : formatted;
  }
}
