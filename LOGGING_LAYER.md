# Logging Layer Report

## Overview
A lightweight, high-performance server-side logging utility has been implemented to track critical operational events and system health.

## Implementation Details
- **Utility**: `logger.ts` in `server/utils/`
- **Storage**: In-memory log buffer with a maximum size of 1,000 entries for performance.
- **Console Integration**: All logs are simultaneously output to the server console for immediate visibility.
- **Metadata Support**: Ability to attach detailed JSON metadata to every log entry for deep debugging.

## Logged Events
The system now automatically logs the following critical operational events:

| Event | Description | Log Level |
| :--- | :--- | :--- |
| **ORDER_CREATED** | New customer order created via QR scan | `info` |
| **ORDER_ACCEPTED** | Chef started preparing an order item | `info` |
| **ORDER_READY** | Order item is ready for service | `info` |
| **ORDER_SERVED** | Order item has been delivered to the table | `info` |
| **TABLE_STATUS_CHANGED** | Table status updated (e.g., available to occupied) | `info` |
| **RATE_LIMIT_EXCEEDED** | Duplicate order attempt within 5 seconds | `warn` |
| **INVALID_STATUS_TRANSITION** | Attempted invalid order state change | `warn` |
| **ORDER_SUBMISSION_ERROR** | Failure during order creation or processing | `error` |
| **DATABASE_TIMEOUT** | Database connection or query timeout | `error` |

## Log Entry Structure
Each log entry contains:
- **ID**: Unique nanoid for tracking
- **Level**: `info`, `warn`, or `error`
- **Event**: Standardized event name
- **Message**: Human-readable description
- **Metadata**: Contextual data (e.g., order ID, table ID, input data)
- **Timestamp**: Precise date and time of the event

## Benefits
- **Operational Visibility**: Real-time tracking of cafeteria activity.
- **Audit Trail**: History of order status changes and table transitions.
- **Rapid Debugging**: Detailed error logs with full context for every failure.
- **Zero External Dependencies**: Lightweight implementation without external logging services.
