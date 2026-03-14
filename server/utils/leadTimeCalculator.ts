/**
 * Lead Time Calculator
 * Calculates and formats the time elapsed between different stages of order processing
 */

export interface LeadTimeMetrics {
  totalElapsed: number; // milliseconds
  submittedToKitchen: number; // milliseconds
  kitchenToPreparing: number; // milliseconds
  preparingToReady: number; // milliseconds
  readyToServed: number; // milliseconds
}

export interface LeadTimeFormatted {
  totalElapsed: string;
  submittedToKitchen: string;
  kitchenToPreparing: string;
  preparingToReady: string;
  readyToServed: string;
}

/**
 * Calculate lead time metrics for an order
 */
export function calculateLeadTimeMetrics(
  createdAt: Date,
  sentToKitchenAt?: Date,
  readyAt?: Date,
  servedAt?: Date
): LeadTimeMetrics {
  const now = new Date();
  const finalTime = servedAt || readyAt || sentToKitchenAt || now;

  return {
    totalElapsed: finalTime.getTime() - createdAt.getTime(),
    submittedToKitchen: sentToKitchenAt ? sentToKitchenAt.getTime() - createdAt.getTime() : 0,
    kitchenToPreparing: sentToKitchenAt && readyAt ? readyAt.getTime() - sentToKitchenAt.getTime() : 0,
    preparingToReady: readyAt && servedAt ? servedAt.getTime() - readyAt.getTime() : 0,
    readyToServed: servedAt && readyAt ? servedAt.getTime() - readyAt.getTime() : 0,
  };
}

/**
 * Format milliseconds to human-readable string (e.g., "5m 30s")
 */
export function formatMilliseconds(ms: number): string {
  if (ms < 0) return "0s";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format lead time metrics to human-readable strings
 */
export function formatLeadTimeMetrics(metrics: LeadTimeMetrics): LeadTimeFormatted {
  return {
    totalElapsed: formatMilliseconds(metrics.totalElapsed),
    submittedToKitchen: formatMilliseconds(metrics.submittedToKitchen),
    kitchenToPreparing: formatMilliseconds(metrics.kitchenToPreparing),
    preparingToReady: formatMilliseconds(metrics.preparingToReady),
    readyToServed: formatMilliseconds(metrics.readyToServed),
  };
}

/**
 * Get order status with lead time
 */
export interface OrderStatusWithLeadTime {
  status: string;
  elapsedTime: string;
  metrics: LeadTimeFormatted;
}

export function getOrderStatusWithLeadTime(
  createdAt: Date,
  orderStatus: string,
  sentToKitchenAt?: Date,
  readyAt?: Date,
  servedAt?: Date
): OrderStatusWithLeadTime {
  const metrics = calculateLeadTimeMetrics(createdAt, sentToKitchenAt, readyAt, servedAt);
  const formatted = formatLeadTimeMetrics(metrics);

  return {
    status: orderStatus,
    elapsedTime: formatted.totalElapsed,
    metrics: formatted,
  };
}

/**
 * Calculate average lead times for analytics
 */
export interface AverageLeadTimes {
  avgSubmittedToKitchen: string;
  avgKitchenToPreparing: string;
  avgPreparingToReady: string;
  avgReadyToServed: string;
  avgTotalTime: string;
}

export function calculateAverageLeadTimes(orders: Array<{ createdAt: Date; sentToKitchenAt?: Date; readyAt?: Date; servedAt?: Date }>): AverageLeadTimes {
  if (orders.length === 0) {
    return {
      avgSubmittedToKitchen: "0s",
      avgKitchenToPreparing: "0s",
      avgPreparingToReady: "0s",
      avgReadyToServed: "0s",
      avgTotalTime: "0s",
    };
  }

  let totalSubmittedToKitchen = 0;
  let totalKitchenToPreparing = 0;
  let totalPreparingToReady = 0;
  let totalReadyToServed = 0;
  let totalTime = 0;

  orders.forEach((order) => {
    const metrics = calculateLeadTimeMetrics(order.createdAt, order.sentToKitchenAt, order.readyAt, order.servedAt);
    totalSubmittedToKitchen += metrics.submittedToKitchen;
    totalKitchenToPreparing += metrics.kitchenToPreparing;
    totalPreparingToReady += metrics.preparingToReady;
    totalReadyToServed += metrics.readyToServed;
    totalTime += metrics.totalElapsed;
  });

  return {
    avgSubmittedToKitchen: formatMilliseconds(totalSubmittedToKitchen / orders.length),
    avgKitchenToPreparing: formatMilliseconds(totalKitchenToPreparing / orders.length),
    avgPreparingToReady: formatMilliseconds(totalPreparingToReady / orders.length),
    avgReadyToServed: formatMilliseconds(totalReadyToServed / orders.length),
    avgTotalTime: formatMilliseconds(totalTime / orders.length),
  };
}
