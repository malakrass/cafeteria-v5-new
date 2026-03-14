/**
 * Reporting Engine
 * Handles report generation and analytics calculations
 */

/**
 * Cafeteria report structure
 */
export interface CafeteriaReportData {
  cafeteriaId: string;
  cafeteriaName: string;
  reportType: "daily" | "weekly" | "monthly";
  reportDate: Date;
  totalSales: number;
  totalOrders: number;
  totalItemsSold: number;
  totalPointsDeducted: number;
  averageOrderValue: number;
  topItems: Array<{ itemId: string; itemName: string; quantity: number; revenue: number }>;
  topStaff: Array<{ staffId: string; staffName: string; sales: number; orders: number }>;
}

/**
 * Sales trend structure
 */
export interface SalesTrend {
  date: Date;
  sales: number;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
}

/**
 * Calculate total sales from orders
 */
export function calculateTotalSales(orders: any[]): number {
  return orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
}

/**
 * Calculate average order value
 */
export function calculateAverageOrderValue(totalSales: number, totalOrders: number): number {
  if (totalOrders === 0) return 0;
  return Math.round((totalSales / totalOrders) * 100) / 100;
}

/**
 * Calculate total items sold from order items
 */
export function calculateTotalItemsSold(orderItems: any[]): number {
  return orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

/**
 * Get top selling items
 */
export function getTopSellingItems(
  orderItems: any[],
  limit: number = 10
): Array<{ itemId: string; itemName: string; quantity: number; revenue: number }> {
  const itemMap = new Map<string, { itemName: string; quantity: number; revenue: number }>();

  orderItems.forEach((item) => {
    const key = item.menuItemId;
    if (!itemMap.has(key)) {
      itemMap.set(key, { itemName: item.itemName || "", quantity: 0, revenue: 0 });
    }

    const existing = itemMap.get(key)!;
    existing.quantity += item.quantity || 0;
    existing.revenue += Number(item.totalPrice) || 0;
  });

  return Array.from(itemMap.entries())
    .map(([itemId, data]) => ({ itemId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Get top performing staff
 */
export function getTopPerformingStaff(
  shifts: any[],
  limit: number = 10
): Array<{ staffId: string; staffName: string; sales: number; orders: number }> {
  const staffMap = new Map<string, { staffName: string; sales: number; orders: number }>();

  shifts.forEach((shift) => {
    const key = shift.staffId;
    if (!staffMap.has(key)) {
      staffMap.set(key, { staffName: shift.staffName || "", sales: 0, orders: 0 });
    }

    const existing = staffMap.get(key)!;
    existing.sales += Number(shift.totalSales) || 0;
    existing.orders += shift.totalOrders || 0;
  });

  return Array.from(staffMap.entries())
    .map(([staffId, data]) => ({ staffId, ...data }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

/**
 * Calculate sales trend over time
 */
export function calculateSalesTrend(orders: any[]): SalesTrend[] {
  const trendMap = new Map<string, { sales: number; orders: number; itemsSold: number }>();

  orders.forEach((order) => {
    const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { sales: 0, orders: 0, itemsSold: 0 });
    }

    const existing = trendMap.get(dateKey)!;
    existing.sales += Number(order.totalAmount) || 0;
    existing.orders += 1;
  });

  return Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date: new Date(date),
      sales: data.sales,
      orders: data.orders,
      itemsSold: data.itemsSold,
      averageOrderValue: data.orders > 0 ? Math.round((data.sales / data.orders) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Generate cafeteria report
 */
export function generateCafeteriaReport(
  cafeteriaId: string,
  cafeteriaName: string,
  reportType: "daily" | "weekly" | "monthly",
  orders: any[],
  orderItems: any[],
  shifts: any[]
): CafeteriaReportData {
  const totalSales = calculateTotalSales(orders);
  const totalOrders = orders.length;
  const totalItemsSold = calculateTotalItemsSold(orderItems);
  const totalPointsDeducted = orders.reduce((sum, order) => sum + (Number(order.pointsConsumed) || 0), 0);
  const averageOrderValue = calculateAverageOrderValue(totalSales, totalOrders);

  return {
    cafeteriaId,
    cafeteriaName,
    reportType,
    reportDate: new Date(),
    totalSales,
    totalOrders,
    totalItemsSold,
    totalPointsDeducted,
    averageOrderValue,
    topItems: getTopSellingItems(orderItems),
    topStaff: getTopPerformingStaff(shifts),
  };
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(previousValue: number, currentValue: number): number {
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return Math.round(((currentValue - previousValue) / previousValue) * 10000) / 100;
}

/**
 * Format currency for report
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  return formatter.format(amount);
}

/**
 * Format percentage for report
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get report summary text
 */
export function getReportSummaryText(report: CafeteriaReportData): string {
  return `
    Cafeteria: ${report.cafeteriaName}
    Report Type: ${report.reportType.toUpperCase()}
    Report Date: ${report.reportDate.toISOString().split("T")[0]}
    
    Sales Summary:
    - Total Sales: ${formatCurrency(report.totalSales)}
    - Total Orders: ${report.totalOrders}
    - Items Sold: ${report.totalItemsSold}
    - Average Order Value: ${formatCurrency(report.averageOrderValue)}
    - Points Deducted: ${report.totalPointsDeducted.toFixed(2)}
  `.trim();
}

/**
 * Compare two reports
 */
export function compareReports(
  report1: CafeteriaReportData,
  report2: CafeteriaReportData
): {
  salesGrowth: number;
  ordersGrowth: number;
  itemsGrowth: number;
  averageOrderValueGrowth: number;
} {
  return {
    salesGrowth: calculateGrowthRate(report1.totalSales, report2.totalSales),
    ordersGrowth: calculateGrowthRate(report1.totalOrders, report2.totalOrders),
    itemsGrowth: calculateGrowthRate(report1.totalItemsSold, report2.totalItemsSold),
    averageOrderValueGrowth: calculateGrowthRate(
      report1.averageOrderValue,
      report2.averageOrderValue
    ),
  };
}

/**
 * Calculate peak hours from orders
 */
export function calculatePeakHours(
  orders: any[]
): Array<{ hour: number; orderCount: number; totalSales: number }> {
  const hourMap = new Map<number, { orderCount: number; totalSales: number }>();

  orders.forEach((order) => {
    const hour = new Date(order.createdAt).getHours();
    if (!hourMap.has(hour)) {
      hourMap.set(hour, { orderCount: 0, totalSales: 0 });
    }

    const existing = hourMap.get(hour)!;
    existing.orderCount += 1;
    existing.totalSales += Number(order.totalAmount) || 0;
  });

  return Array.from(hourMap.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => b.orderCount - a.orderCount);
}

/**
 * Validate report parameters
 */
export function validateReportParameters(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.cafeteriaId) {
    errors.push("Cafeteria ID is required");
  }

  if (!data.reportType || !["daily", "weekly", "monthly"].includes(data.reportType)) {
    errors.push("Invalid report type");
  }

  if (!data.reportDate) {
    errors.push("Report date is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
