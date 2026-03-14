/**
 * Currency Engine
 * Manages country/currency inheritance and validation
 *
 * Core Rules:
 * - Marketers and cafeterias inherit country/currency from parent
 * - Only Owner can choose country/currency for direct children
 * - Only Owner can modify country/currency for selected children
 * - Staff must match cafeteria country/currency context
 * - System uses USD as internal economic base
 * - Local currency for display and invoice entry only
 */

/**
 * Validate country code (ISO 3166-1 alpha-2)
 * @param country - Country code (e.g., 'US', 'GB', 'IN')
 * @returns true if valid country code
 */
export function isValidCountryCode(country: string): boolean {
  // ISO 3166-1 alpha-2 codes are exactly 2 uppercase letters
  return /^[A-Z]{2}$/.test(country);
}

/**
 * Validate currency code (ISO 4217)
 * @param currency - Currency code (e.g., 'USD', 'EUR', 'INR')
 * @returns true if valid currency code
 */
export function isValidCurrencyCode(currency: string): boolean {
  // ISO 4217 codes are exactly 3 uppercase letters
  return /^[A-Z]{3}$/.test(currency);
}

/**
 * Validate country/currency combination
 * @param country - Country code
 * @param currency - Currency code
 * @returns true if valid combination
 */
export function isValidCountryCurrencyCombination(country: string, currency: string): boolean {
  // Basic validation - in production, use a comprehensive mapping
  const validCombinations: Record<string, string[]> = {
    US: ["USD"],
    GB: ["GBP"],
    EU: ["EUR"],
    IN: ["INR"],
    JP: ["JPY"],
    CN: ["CNY"],
    BR: ["BRL"],
    MX: ["MXN"],
    AU: ["AUD"],
    CA: ["CAD"],
    SG: ["SGD"],
    HK: ["HKD"],
    AE: ["AED"],
    SA: ["SAR"],
    KR: ["KRW"],
    TH: ["THB"],
    PH: ["PHP"],
    ID: ["IDR"],
    MY: ["MYR"],
    VN: ["VND"],
  };

  const allowedCurrencies = validCombinations[country];
  return allowedCurrencies ? allowedCurrencies.includes(currency) : false;
}

/**
 * Get default currency for a country
 * @param country - Country code
 * @returns Default currency code or null
 */
export function getDefaultCurrencyForCountry(country: string): string | null {
  const countryToCurrency: Record<string, string> = {
    US: "USD",
    GB: "GBP",
    EU: "EUR",
    IN: "INR",
    JP: "JPY",
    CN: "CNY",
    BR: "BRL",
    MX: "MXN",
    AU: "AUD",
    CA: "CAD",
    SG: "SGD",
    HK: "HKD",
    AE: "AED",
    SA: "SAR",
    KR: "KRW",
    TH: "THB",
    PH: "PHP",
    ID: "IDR",
    MY: "MYR",
    VN: "VND",
  };

  return countryToCurrency[country] || null;
}

/**
 * Validate currency override permission
 * @param userId - User ID attempting override
 * @param ownerOpenId - Owner's OpenID
 * @returns true if user is owner and can override
 */
export function canOverrideCurrency(userId: string, ownerOpenId: string): boolean {
  return userId === ownerOpenId;
}

/**
 * Format currency amount for display
 * @param amount - Amount in currency
 * @param currency - Currency code
 * @returns Formatted string (e.g., "USD 100.00")
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  try {
    return formatter.format(amount);
  } catch {
    // Fallback if currency code is invalid
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Convert points to USD
 * @param points - Points value
 * @param pointsMultiplier - Points per USD (default 100)
 * @returns USD amount
 */
export function convertPointsToUsd(points: number, pointsMultiplier: number = 100): number {
  return points / pointsMultiplier;
}

/**
 * Convert USD to points
 * @param usd - USD amount
 * @param pointsMultiplier - Points per USD (default 100)
 * @returns Points value
 */
export function convertUsdToPoints(usd: number, pointsMultiplier: number = 100): number {
  return Math.ceil(usd * pointsMultiplier);
}

/**
 * Get currency symbol for display
 * @param currency - Currency code
 * @returns Currency symbol or code
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    INR: "₹",
    BRL: "R$",
    MXN: "$",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    HKD: "HK$",
    AED: "د.إ",
    SAR: "﷼",
    KRW: "₩",
    THB: "฿",
    PHP: "₱",
    IDR: "Rp",
    MYR: "RM",
    VND: "₫",
  };

  return symbols[currency] || currency;
}

/**
 * Validate weak currency support (no decimal points)
 * @param currency - Currency code
 * @returns true if currency should not use decimals
 */
export function isWeakCurrency(currency: string): boolean {
  // Currencies typically without decimal places
  const weakCurrencies = ["JPY", "KRW", "VND", "IDR", "PHP"];
  return weakCurrencies.includes(currency);
}

/**
 * Format amount for weak currency (no decimals)
 * @param amount - Amount
 * @param currency - Currency code
 * @returns Formatted amount
 */
export function formatWeakCurrency(amount: number, currency: string): number {
  if (isWeakCurrency(currency)) {
    return Math.round(amount);
  }
  return amount;
}

/**
 * Get currency information
 * @param currency - Currency code
 * @returns Currency info object
 */
export function getCurrencyInfo(currency: string) {
  return {
    code: currency,
    symbol: getCurrencySymbol(currency),
    isWeak: isWeakCurrency(currency),
    decimals: isWeakCurrency(currency) ? 0 : 2,
  };
}

/**
 * Validate currency inheritance from parent
 * @param parentCurrency - Parent's currency
 * @param childCurrency - Child's currency
 * @returns true if inheritance is valid
 */
export function isValidCurrencyInheritance(
  parentCurrency: string | null,
  childCurrency: string | null
): boolean {
  // Child must match parent if parent exists
  if (parentCurrency && childCurrency) {
    return parentCurrency === childCurrency;
  }
  // If no parent, child can be any valid currency
  return true;
}

/**
 * Get currency conversion rate (placeholder)
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @returns Conversion rate (1 unit of fromCurrency = rate units of toCurrency)
 */
export function getCurrencyConversionRate(
  fromCurrency: string,
  toCurrency: string
): number {
  // This is a placeholder - in production, use real exchange rates
  if (fromCurrency === toCurrency) {
    return 1;
  }

  // Simplified rates for demonstration (use real rates in production)
  const rates: Record<string, Record<string, number>> = {
    USD: {
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      INR: 83.12,
      AUD: 1.53,
      CAD: 1.36,
    },
    EUR: {
      USD: 1.09,
      GBP: 0.86,
      JPY: 162.5,
      INR: 90.3,
    },
    GBP: {
      USD: 1.27,
      EUR: 1.16,
      JPY: 189.0,
      INR: 105.0,
    },
  };

  return rates[fromCurrency]?.[toCurrency] || 1;
}

/**
 * Convert amount between currencies
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const rate = getCurrencyConversionRate(fromCurrency, toCurrency);
  return amount * rate;
}
