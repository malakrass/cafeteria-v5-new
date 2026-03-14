/**
 * Shift Engine
 * Handles shift management, tracking, and performance calculations
 */

/**
 * Shift summary structure
 */
export interface ShiftSummary {
  shiftId: string;
  staffId: string;
  staffName: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  status: "active" | "completed" | "cancelled";
  totalSales: number;
  totalOrders: number;
  totalItemsSold: number;
  averageOrderValue: number;
}

/**
 * Staff performance structure
 */
export interface StaffPerformanceMetrics {
  staffId: string;
  totalShifts: number;
  totalSales: number;
  totalOrders: number;
  totalItemsSold: number;
  averageOrderValue: number;
  averageSalesPerShift: number;
  averageOrdersPerShift: number;
  totalHoursWorked: number;
  salesPerHour: number;
}

/**
 * Calculate shift duration in minutes
 */
export function calculateShiftDuration(startTime: Date, endTime?: Date): number {
  const end = endTime || new Date();
  const durationMs = end.getTime() - startTime.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  return Math.max(0, durationMinutes);
}

/**
 * Calculate shift duration in hours
 */
export function calculateShiftDurationHours(startTime: Date, endTime?: Date): number {
  const minutes = calculateShiftDuration(startTime, endTime);
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Calculate average order value
 */
export function calculateAverageOrderValue(totalSales: number, totalOrders: number): number {
  if (totalOrders === 0) return 0;
  return Math.round((totalSales / totalOrders) * 100) / 100;
}

/**
 * Calculate sales per hour
 */
export function calculateSalesPerHour(totalSales: number, hoursWorked: number): number {
  if (hoursWorked === 0) return 0;
  return Math.round((totalSales / hoursWorked) * 100) / 100;
}

/**
 * Calculate orders per hour
 */
export function calculateOrdersPerHour(totalOrders: number, hoursWorked: number): number {
  if (hoursWorked === 0) return 0;
  return Math.round((totalOrders / hoursWorked) * 100) / 100;
}

/**
 * Build shift summary
 */
export function buildShiftSummary(
  shiftId: string,
  staffId: string,
  staffName: string,
  startTime: Date,
  endTime: Date | undefined,
  status: "active" | "completed" | "cancelled",
  totalSales: number,
  totalOrders: number,
  totalItemsSold: number
): ShiftSummary {
  const duration = calculateShiftDuration(startTime, endTime);
  const averageOrderValue = calculateAverageOrderValue(totalSales, totalOrders);

  return {
    shiftId,
    staffId,
    staffName,
    startTime,
    endTime,
    duration,
    status,
    totalSales,
    totalOrders,
    totalItemsSold,
    averageOrderValue,
  };
}

/**
 * Build staff performance metrics
 */
export function buildStaffPerformanceMetrics(
  staffId: string,
  totalShifts: number,
  totalSales: number,
  totalOrders: number,
  totalItemsSold: number,
  totalHoursWorked: number
): StaffPerformanceMetrics {
  const averageOrderValue = calculateAverageOrderValue(totalSales, totalOrders);
  const averageSalesPerShift = totalShifts > 0 ? Math.round((totalSales / totalShifts) * 100) / 100 : 0;
  const averageOrdersPerShift = totalShifts > 0 ? Math.round((totalOrders / totalShifts) * 100) / 100 : 0;
  const salesPerHour = calculateSalesPerHour(totalSales, totalHoursWorked);

  return {
    staffId,
    totalShifts,
    totalSales,
    totalOrders,
    totalItemsSold,
    averageOrderValue,
    averageSalesPerShift,
    averageOrdersPerShift,
    totalHoursWorked,
    salesPerHour,
  };
}

/**
 * Check if staff has active shift
 */
export function hasActiveShift(shifts: any[]): boolean {
  return shifts.some((shift) => shift.status === "active");
}

/**
 * Get active shift for staff
 */
export function getActiveShift(shifts: any[]): any | null {
  return shifts.find((shift) => shift.status === "active") || null;
}

/**
 * Validate shift can be ended
 */
export function validateShiftEnd(shift: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!shift) {
    errors.push("Shift not found");
  }

  if (shift && shift.status !== "active") {
    errors.push(`Shift is not active (status: ${shift.status})`);
  }

  if (shift && !shift.startTime) {
    errors.push("Shift start time is missing");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate shift performance rating (0-100)
 */
export function calculatePerformanceRating(
  metrics: StaffPerformanceMetrics,
  benchmarks: {
    avgSalesPerHour: number;
    avgOrdersPerHour: number;
  }
): number {
  let rating = 50; // Base rating

  // Sales performance (0-25 points)
  const salesRatio = metrics.salesPerHour / benchmarks.avgSalesPerHour;
  if (salesRatio >= 1.2) rating += 25;
  else if (salesRatio >= 1.0) rating += 20;
  else if (salesRatio >= 0.8) rating += 15;
  else if (salesRatio >= 0.6) rating += 10;
  else rating += 5;

  // Orders performance (0-25 points)
  const ordersPerHour = metrics.totalOrders / (metrics.totalHoursWorked || 1);
  const ordersRatio = ordersPerHour / benchmarks.avgOrdersPerHour;
  if (ordersRatio >= 1.2) rating += 25;
  else if (ordersRatio >= 1.0) rating += 20;
  else if (ordersRatio >= 0.8) rating += 15;
  else if (ordersRatio >= 0.6) rating += 10;
  else rating += 5;

  return Math.min(100, rating);
}

/**
 * Format shift summary for display
 */
export function formatShiftSummary(summary: ShiftSummary): string {
  const durationHours = Math.floor(summary.duration / 60);
  const durationMinutes = summary.duration % 60;

  return `
    Shift: ${summary.shiftId}
    Staff: ${summary.staffName}
    Duration: ${durationHours}h ${durationMinutes}m
    Status: ${summary.status}
    Total Sales: ${summary.totalSales.toFixed(2)}
    Total Orders: ${summary.totalOrders}
    Items Sold: ${summary.totalItemsSold}
    Avg Order Value: ${summary.averageOrderValue.toFixed(2)}
  `.trim();
}

/**
 * Compare two shifts
 */
export function compareShifts(shift1: ShiftSummary, shift2: ShiftSummary): {
  salesDifference: number;
  salesPercentageDifference: number;
  ordersDifference: number;
  ordersPercentageDifference: number;
} {
  const salesDiff = shift2.totalSales - shift1.totalSales;
  const salesPercentDiff = shift1.totalSales > 0 ? (salesDiff / shift1.totalSales) * 100 : 0;

  const ordersDiff = shift2.totalOrders - shift1.totalOrders;
  const ordersPercentDiff = shift1.totalOrders > 0 ? (ordersDiff / shift1.totalOrders) * 100 : 0;

  return {
    salesDifference: Math.round(salesDiff * 100) / 100,
    salesPercentageDifference: Math.round(salesPercentDiff * 100) / 100,
    ordersDifference: ordersDiff,
    ordersPercentageDifference: Math.round(ordersPercentDiff * 100) / 100,
  };
}

/**
 * Get shift status badge color
 */
export function getShiftStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "blue";
    case "completed":
      return "green";
    case "cancelled":
      return "red";
    default:
      return "gray";
  }
}

/**
 * Validate shift data
 */
export function validateShiftData(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.staffId) {
    errors.push("Staff ID is required");
  }

  if (!data.cafeteriaId) {
    errors.push("Cafeteria ID is required");
  }

  if (!data.startTime) {
    errors.push("Start time is required");
  }

  if (data.endTime && new Date(data.endTime) <= new Date(data.startTime)) {
    errors.push("End time must be after start time");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
