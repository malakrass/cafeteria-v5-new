/**
 * Commission Engine
 * Manages recharge-based commission calculations and distribution
 *
 * Core Rules:
 * - Commissions calculated on RECHARGE events only (not sales)
 * - Commission distributed up the marketer hierarchy
 * - Previous recharge's pending commission becomes available on next recharge
 * - Marketer balances tracked in USD (not points)
 * - Commission lifetime can expire, blocking new commissions
 */

import { addPrecise, multiplyPrecise, dividePrecise, subtractPrecise, roundTo } from "./precision";

export interface CommissionDistribution {
  id: string;
  rechargeRequestId: string;
  marketerId: string;
  level: number;
  commissionAmount: number;
  status: "pending" | "available" | "withdrawn";
  createdAt: Date;
}

export interface MarketerBalance {
  id: string;
  marketerId: string;
  pendingBalance: number;
  availableBalance: number;
  totalWithdrawn: number;
  lastUpdated: Date;
}

/**
 * Calculate commission for a recharge amount
 * @param rechargeAmount - Amount in USD
 * @param commissionRate - Commission rate as percentage (e.g., 5 for 5%)
 * @returns Commission amount in USD
 */
export function calculateCommissionAmount(
  rechargeAmount: number,
  commissionRate: number
): number {
  return dividePrecise(multiplyPrecise(rechargeAmount, commissionRate), 100);
}

/**
 * Build the hierarchy path for a cafeteria's marketers
 * @param marketersHierarchy - Array of marketers from cafeteria's marketer up to root
 * @returns Array of marketers in order (closest parent first)
 */
export function buildHierarchyPath(
  marketersHierarchy: Array<{ id: string; parentId: string | null; referenceCode: string }>
): string[] {
  // Sort by reference code length (shorter = higher in hierarchy)
  return marketersHierarchy
    .sort((a, b) => (a.referenceCode?.length || 0) - (b.referenceCode?.length || 0))
    .map((m) => m.id);
}

/**
 * Calculate commission distributions for a recharge across the hierarchy
 * @param rechargeAmount - Amount in USD
 * @param marketersHierarchy - Array of marketers from cafeteria's marketer to root
 * @param commissionRates - Map of marketerId to commission rate
 * @returns Array of commission distributions
 */
export function calculateCommissionDistributions(
  rechargeAmount: number,
  marketersHierarchy: Array<{ id: string; parentId: string | null; referenceCode: string }>,
  commissionRates: Map<string, number>
): Array<{
  marketerId: string;
  level: number;
  commissionAmount: number;
}> {
  const distributions: Array<{
    marketerId: string;
    level: number;
    commissionAmount: number;
  }> = [];

  // Sort by reference code length to get hierarchy order
  const sortedMarketers = marketersHierarchy
    .sort((a, b) => (a.referenceCode?.length || 0) - (b.referenceCode?.length || 0))
    .reverse(); // Reverse so direct parent is first

  // Calculate commission for each level
  sortedMarketers.forEach((marketer, index) => {
    const rate = commissionRates.get(marketer.id) || 0;
    const commissionAmount = calculateCommissionAmount(rechargeAmount, rate);

    if (commissionAmount > 0) {
      distributions.push({
        marketerId: marketer.id,
        level: index + 1,
        commissionAmount,
      });
    }
  });

  return distributions;
}

/**
 * Validate if a commission is still active (not expired)
 * @param expiryDate - Commission expiry date
 * @returns true if commission is still active, false if expired
 */
export function isCommissionActive(expiryDate: Date | null): boolean {
  if (!expiryDate) {
    return true; // No expiry = always active
  }
  return new Date() < expiryDate;
}

/**
 * Calculate commission expiry date based on lifetime
 * @param startDate - Commission start date
 * @param lifetimeMonths - Commission lifetime in months
 * @returns Expiry date
 */
export function calculateCommissionExpiryDate(startDate: Date, lifetimeMonths: number): Date {
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + lifetimeMonths);
  return expiryDate;
}

/**
 * Format commission amount for display
 * @param amount - Amount in USD
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @returns Formatted string
 */
export function formatCommissionAmount(amount: number, currency: string = "USD"): string {
  return `${currency} ${roundTo(amount).toFixed(2)}`;
}

/**
 * Get commission status summary for a marketer
 * @param pendingBalance - Pending commission balance
 * @param availableBalance - Available commission balance
 * @param totalWithdrawn - Total withdrawn
 * @returns Status summary object
 */
export function getCommissionStatusSummary(
  pendingBalance: number,
  availableBalance: number,
  totalWithdrawn: number
) {
  const totalEarned = addPrecise(pendingBalance, availableBalance, totalWithdrawn);
  return {
    pendingBalance: roundTo(pendingBalance),
    availableBalance: roundTo(availableBalance),
    totalWithdrawn: roundTo(totalWithdrawn),
    totalEarned,
    canWithdraw: roundTo(availableBalance) > 0,
  };
}

/**
 * Validate commission distribution data
 * @param distributions - Array of distributions to validate
 * @returns Validation result with any errors
 */
export function validateCommissionDistributions(
  distributions: Array<{
    marketerId: string;
    level: number;
    commissionAmount: number;
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(distributions)) {
    errors.push("Distributions must be an array");
    return { valid: false, errors };
  }

  distributions.forEach((dist, index) => {
    if (!dist.marketerId) {
      errors.push(`Distribution ${index}: marketerId is required`);
    }
    if (typeof dist.level !== "number" || dist.level < 1) {
      errors.push(`Distribution ${index}: level must be a positive number`);
    }
    if (typeof dist.commissionAmount !== "number" || dist.commissionAmount < 0) {
      errors.push(`Distribution ${index}: commissionAmount must be non-negative`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate total commission amount across all distributions
 * @param distributions - Array of distributions
 * @returns Total commission amount
 */
export function calculateTotalCommission(
  distributions: Array<{
    commissionAmount: number;
  }>
): number {
  return distributions.reduce((sum, dist) => addPrecise(sum, dist.commissionAmount), 0);
}

/**
 * Get commission history summary
 * @param distributions - Array of commission distributions
 * @returns Summary with counts by status
 */
export function getCommissionHistorySummary(
  distributions: Array<{
    status: string;
    commissionAmount: number;
  }>
) {
  const summary = {
    totalDistributions: distributions.length,
    pendingCount: 0,
    availableCount: 0,
    withdrawnCount: 0,
    pendingAmount: 0,
    availableAmount: 0,
    withdrawnAmount: 0,
  };

  distributions.forEach((dist) => {
    if (dist.status === "pending") {
      summary.pendingCount++;
      summary.pendingAmount = addPrecise(summary.pendingAmount, dist.commissionAmount);
    } else if (dist.status === "available") {
      summary.availableCount++;
      summary.availableAmount = addPrecise(summary.availableAmount, dist.commissionAmount);
    } else if (dist.status === "withdrawn") {
      summary.withdrawnCount++;
      summary.withdrawnAmount = addPrecise(summary.withdrawnAmount, dist.commissionAmount);
    }
  });

  return summary;
}
