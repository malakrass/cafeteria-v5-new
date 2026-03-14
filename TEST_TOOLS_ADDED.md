# Test Tools Added Report

## Overview
A new "System Test Tools" section has been added to the Owner Dashboard to facilitate rapid testing and simulation of the cafeteria workflow.

## Features
- **Simulate Customer Order**: Creates a random customer order for an available table, allowing for end-to-end testing of the QR ordering flow.
- **Clear All Tables**: Resets all tables in the cafeteria to `available` status, providing a quick way to reset the system for a new test run.
- **Reset System State**: A placeholder for more advanced system reset functionality.

## Implementation Details
- **Component**: Created `SystemTestTools.tsx` to house the test logic.
- **Integration**: Added to the `OwnerDashboard` under a new "System Test Tools" tab.
- **Simulation Logic**: Randomly selects an available table and menu items to create a realistic order scenario.
