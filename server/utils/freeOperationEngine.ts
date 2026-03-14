/**
 * Free Operation Engine
 * Manages free operation periods for cafeterias
 *
 * Core Rules:
 * - Type A: Global first-time free period for newly created cafeterias
 * - Type B: Special grant free period for specific cafeterias with start/end dates
 * - During free period: cafeteria operates, points NOT deducted, commissions NOT generated
 * - After free period: normal points deduction resumes
 * - System stops operation when balance insufficient for invoice
 * - Grace mode can optionally allow temporary zero-balance operation
 */

/**
 * Free operation period type
 */
export type FreeOperationPeriodType = "global_first_time" | "special_grant";

/**
 * Free operation period record
 */
export interface FreeOperationPeriod {
  id: string;
  cafeteriaId: string;
  periodType: FreeOperationPeriodType;
  startDate: Date;
  endDate: Date;
  reason?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Check if a cafeteria is currently in a free operation period
 * @param activePeriods - Array of active free operation periods
 * @returns true if currently in free period, false otherwise
 */
export function isInFreeOperationPeriod(activePeriods: FreeOperationPeriod[]): boolean {
  if (!activePeriods || activePeriods.length === 0) {
    return false;
  }

  const now = new Date();

  return activePeriods.some((period) => {
    return now >= period.startDate && now <= period.endDate;
  });
}

/**
 * Get the current active free operation period
 * @param periods - Array of all free operation periods
 * @returns Active period or null
 */
export function getActiveFreeOperationPeriod(periods: FreeOperationPeriod[]): FreeOperationPeriod | null {
  if (!periods || periods.length === 0) {
    return null;
  }

  const now = new Date();

  for (const period of periods) {
    if (now >= period.startDate && now <= period.endDate) {
      return period;
    }
  }

  return null;
}

/**
 * Get the end date of the current free operation period
 * @param periods - Array of all free operation periods
 * @returns End date or null
 */
export function getFreeOperationEndDate(periods: FreeOperationPeriod[]): Date | null {
  const activePeriod = getActiveFreeOperationPeriod(periods);
  return activePeriod ? activePeriod.endDate : null;
}

/**
 * Calculate days remaining in free operation period
 * @param endDate - End date of free period
 * @returns Number of days remaining (0 if expired)
 */
export function getDaysRemainingInFreePeriod(endDate: Date): number {
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysRemaining);
}

/**
 * Check if points should be deducted for an order
 * @param isInFreePeriod - Whether cafeteria is in free operation period
 * @returns true if points should be deducted, false if free
 */
export function shouldDeductPoints(isInFreePeriod: boolean): boolean {
  return !isInFreePeriod;
}

/**
 * Check if commissions should be generated for a recharge
 * @param isInFreePeriod - Whether cafeteria is in free operation period
 * @returns true if commissions should be generated, false if free
 */
export function shouldGenerateCommissions(isInFreePeriod: boolean): boolean {
  return !isInFreePeriod;
}

/**
 * Create a global first-time free period for a newly created cafeteria
 * @param cafeteriaId - Cafeteria ID
 * @param startDate - Start date (usually now)
 * @param freeMonths - Number of months for free period
 * @returns Free operation period object
 */
export function createGlobalFirstTimePeriod(
  cafeteriaId: string,
  startDate: Date,
  freeMonths: number
): Omit<FreeOperationPeriod, "id" | "createdAt"> {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + freeMonths);

  return {
    cafeteriaId,
    periodType: "global_first_time",
    startDate,
    endDate,
    reason: `Global first-time free period (${freeMonths} months)`,
  };
}

/**
 * Create a special grant free period
 * @param cafeteriaId - Cafeteria ID
 * @param startDate - Start date
 * @param endDate - End date
 * @param reason - Reason for special grant
 * @param createdBy - User ID who created this period
 * @returns Free operation period object
 */
export function createSpecialGrantPeriod(
  cafeteriaId: string,
  startDate: Date,
  endDate: Date,
  reason: string,
  createdBy: string
): Omit<FreeOperationPeriod, "id" | "createdAt"> {
  return {
    cafeteriaId,
    periodType: "special_grant",
    startDate,
    endDate,
    reason,
    createdBy,
  };
}

/**
 * Calculate free period duration in days
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days
 */
export function calculateFreePeriodDuration(startDate: Date, endDate: Date): number {
  const durationMs = endDate.getTime() - startDate.getTime();
  return Math.ceil(durationMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate free period duration in months
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of months (approximate)
 */
export function calculateFreePeriodDurationMonths(startDate: Date, endDate: Date): number {
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  return Math.max(0, months);
}

/**
 * Format free operation period for display
 * @param period - Free operation period
 * @returns Formatted string
 */
export function formatFreePeriod(period: FreeOperationPeriod): string {
  const startStr = period.startDate.toLocaleDateString();
  const endStr = period.endDate.toLocaleDateString();
  const typeLabel = period.periodType === "global_first_time" ? "First-Time Free" : "Special Grant";

  return `${typeLabel}: ${startStr} - ${endStr}`;
}

/**
 * Get free period status message
 * @param isInFreePeriod - Whether currently in free period
 * @param daysRemaining - Days remaining in free period
 * @returns Status message
 */
export function getFreePeriodStatusMessage(isInFreePeriod: boolean, daysRemaining: number): string {
  if (!isInFreePeriod) {
    return "Free operation period has ended. Normal charges apply.";
  }

  if (daysRemaining === 0) {
    return "⚠️ Free operation period ends today!";
  }

  if (daysRemaining === 1) {
    return "⚠️ Free operation period ends tomorrow!";
  }

  if (daysRemaining <= 7) {
    return `⚠️ Free operation period ends in ${daysRemaining} days.`;
  }

  return `✅ Free operation period active (${daysRemaining} days remaining).`;
}

/**
 * Validate free operation period dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Validation result
 */
export function validateFreePeriodDates(
  startDate: Date,
  endDate: Date
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    errors.push("Start date must be a valid date");
  }

  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    errors.push("End date must be a valid date");
  }

  if (startDate >= endDate) {
    errors.push("End date must be after start date");
  }

  const now = new Date();
  if (endDate < now) {
    errors.push("End date cannot be in the past");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get free period summary
 * @param periods - Array of free operation periods
 * @returns Summary object
 */
export function getFreePeriodSummary(periods: FreeOperationPeriod[]) {
  const now = new Date();
  const activePeriods = periods.filter((p) => now >= p.startDate && now <= p.endDate);
  const upcomingPeriods = periods.filter((p) => p.startDate > now);
  const expiredPeriods = periods.filter((p) => p.endDate < now);

  return {
    totalPeriods: periods.length,
    activePeriods: activePeriods.length,
    upcomingPeriods: upcomingPeriods.length,
    expiredPeriods: expiredPeriods.length,
    currentlyFree: activePeriods.length > 0,
    activeUntil: activePeriods.length > 0 ? activePeriods[0].endDate : null,
  };
}

/**
 * Check if a cafeteria is eligible for global first-time free period
 * @param hasExistingFreePeriods - Whether cafeteria already has any free periods
 * @returns true if eligible
 */
export function isEligibleForGlobalFirstTimePeriod(hasExistingFreePeriods: boolean): boolean {
  // Only eligible if no free periods have been created yet
  return !hasExistingFreePeriods;
}

/**
 * Get free period type label
 * @param periodType - Free period type
 * @returns Human-readable label
 */
export function getFreePeriodTypeLabel(periodType: FreeOperationPeriodType): string {
  const labels: Record<FreeOperationPeriodType, string> = {
    global_first_time: "Global First-Time Free Period",
    special_grant: "Special Grant Free Period",
  };
  return labels[periodType] || "Unknown";
}
