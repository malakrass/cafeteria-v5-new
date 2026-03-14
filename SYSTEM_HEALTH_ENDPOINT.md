# System Health Endpoint Report

## Overview
A new system health endpoint has been implemented to provide real-time monitoring of the CAFETERIA V2 application and its dependencies.

## Implementation Details
- **Endpoint**: `/api/trpc/system.health`
- **Access**: Public (for monitoring purposes)
- **Data Source**: Real-time database queries and server-side metrics.
- **Refresh Interval**: On-demand (can be polled by external monitoring tools).

## Metrics Returned
The system health endpoint returns the following key metrics:

| Metric | Description |
| :--- | :--- |
| **status** | Overall system status (`ok` or `error`) |
| **database** | Database connection and query health (`healthy` or `unhealthy`) |
| **activeTables** | Number of tables currently occupied |
| **ordersInProgress** | Number of open orders awaiting completion |
| **uptime** | Server uptime in hours, minutes, and seconds |
| **timestamp** | Precise date and time of the health check |

## Benefits
- **Proactive Monitoring**: External tools can poll the health endpoint to detect issues before they affect users.
- **Operational Visibility**: Real-time metrics for cafeteria occupancy and kitchen workload.
- **Uptime Tracking**: Monitor server stability and identify potential memory leaks or crashes.
- **Easy Integration**: Standard JSON response format for easy integration with monitoring dashboards.

## Verification
The system health endpoint has been verified to:
- Correctly report database health and connectivity.
- Provide accurate counts for active tables and orders in progress.
- Track server uptime correctly from the moment the application starts.
- Return a consistent JSON response for every request.
