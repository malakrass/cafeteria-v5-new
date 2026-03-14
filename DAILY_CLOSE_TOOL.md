# Daily Closing Tool Report

## Overview
A powerful "Close Day" tool has been added to the Owner Dashboard to handle end-of-day operations and prepare the cafeteria for the next day.

## Features
- **Order Closure**: Automatically marks all open orders as "closed" to ensure accurate reporting.
- **Table Reset**: Resets all table statuses to "available" for the next day's operations.
- **Daily Summary**: Generates a concise summary of the day's activity, including total orders and estimated revenue.
- **Audit Logging**: Logs a `DAILY_CLOSE` event for monitoring and auditing purposes.

## Implementation Details
- **Utility**: `dailyClosing.ts` in `server/utils/`
- **Endpoint**: `systemRouter.closeDay`
- **UI Component**: Integrated into the `LaunchToolkitManager` in the Owner Dashboard.

## How to Use
1. Navigate to the **Owner Dashboard**.
2. Select the **Launch Toolkit** tab.
3. Click **Close Day Now**.
4. Confirm the action; a summary will appear upon completion.
