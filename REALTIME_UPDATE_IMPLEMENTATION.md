# Real-Time Update Implementation Report

## Overview
A lightweight real-time update mechanism has been implemented to ensure that Waiter and Chef dashboards are always up-to-date with incoming orders.

## Implementation Details
- **Polling Mechanism**: Utilizes `refetchInterval` from `trpc.useQuery` for efficient, lightweight polling.
- **Waiter Dashboard**: Polls for open orders every 5 seconds to detect new customer orders immediately.
- **Chef Dashboard**: Polls for kitchen-bound items every 5 seconds to ensure the kitchen is always aware of new tasks.
- **Performance**: Polling is only active when the dashboard is open, minimizing server load.

## Benefits
- **Immediate Visibility**: New customer orders appear on the Waiter Dashboard within seconds.
- **Kitchen Efficiency**: Chefs receive new orders without manual page refreshes.
- **Operational Reliability**: Simple polling provides a robust alternative to complex websocket setups for initial testing.
