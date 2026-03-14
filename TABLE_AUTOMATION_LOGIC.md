# Table Automation Logic Report

## Overview
Table status automation has been implemented to ensure that table availability is accurately reflected in the system without manual intervention.

## Automation Logic
| Event | Action | Result |
| :--- | :--- | :--- |
| **Customer Order Created** | `table.status = "occupied"` | Table is marked as occupied on all dashboards. |
| **Last Order Closed** | `table.status = "available"` | Table is automatically returned to available status. |

## Implementation Details
- **Order Creation**: Updated `createCustomerOrder` in `qrOrdersRouter` to automatically set table status to `occupied`.
- **Order Closure**: Updated `closeOrder` in `ordersRouter` to check for other open orders for the same table. If no other open orders exist, the table is automatically set to `available`.
- **Dashboard Updates**: Table status changes are immediately visible on the Waiter Dashboard via polling.
