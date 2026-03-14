/**
 * Dashboard Utilities
 * Shared functions for dashboard calculations and formatting
 */

/**
 * Format currency value
 */
export function formatCurrency(value: number | string, currency = "USD"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format points value
 */
export function formatPoints(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(2)} pts`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format time duration (hours:minutes)
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Format timestamp to readable time
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format timestamp to readable date
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get status color
 */
export function getStatusColor(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "available":
      return "default";
    case "occupied":
      return "secondary";
    case "reserved":
      return "outline";
    case "maintenance":
      return "destructive";
    default:
      return "default";
  }
}

/**
 * Get status badge text
 */
export function getStatusBadgeText(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Calculate occupancy percentage
 */
export function calculateOccupancyPercentage(
  occupied: number,
  total: number
): number {
  if (total === 0) return 0;
  return (occupied / total) * 100;
}

/**
 * Get occupancy level label
 */
export function getOccupancyLevel(percentage: number): string {
  if (percentage < 25) return "Low";
  if (percentage < 50) return "Moderate";
  if (percentage < 75) return "High";
  return "Very High";
}

/**
 * Get occupancy color
 */
export function getOccupancyColor(percentage: number): string {
  if (percentage < 25) return "text-green-600";
  if (percentage < 50) return "text-blue-600";
  if (percentage < 75) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Calculate average value
 */
export function calculateAverage(values: (number | string)[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc: number, val) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return acc + (isNaN(num) ? 0 : num);
  }, 0);
  return sum / values.length;
}

/**
 * Calculate total
 */
export function calculateTotal(values: (number | string)[]): number {
  return values.reduce((acc: number, val) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return acc + (isNaN(num) ? 0 : num);
  }, 0);
}

/**
 * Get time period label
 */
export function getTimePeriodLabel(days: number): string {
  if (days === 1) return "Today";
  if (days === 7) return "This Week";
  if (days === 30) return "This Month";
  return `Last ${days} days`;
}

/**
 * Parse decimal string to number
 */
export function parseDecimal(value: string | number | null | undefined): number {
  if (!value) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}

/**
 * Get order status color
 */
export function getOrderStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800";
    case "preparing":
      return "bg-yellow-100 text-yellow-800";
    case "ready":
      return "bg-green-100 text-green-800";
    case "closed":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get item status color
 */
export function getItemStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-red-100 text-red-800";
    case "preparing":
      return "bg-yellow-100 text-yellow-800";
    case "ready":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Check if shift is active
 */
export function isShiftActive(startTime: Date | string, endTime?: Date | string | null): boolean {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  if (!endTime) return true;
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;
  return start <= new Date() && new Date() <= end;
}

/**
 * Get shift duration in minutes
 */
export function getShiftDurationMinutes(
  startTime: Date | string,
  endTime?: Date | string | null
): number {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  const end = endTime
    ? typeof endTime === "string"
      ? new Date(endTime)
      : endTime
    : new Date();
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}
