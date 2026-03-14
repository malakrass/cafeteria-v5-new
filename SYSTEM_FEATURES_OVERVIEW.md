# CAFETERIA V2 - System Features Overview

## Overview

CAFETERIA V2 is a comprehensive management system designed to streamline operations for cafeterias, encompassing a robust points system, intricate commission distribution, hierarchical marketing structures, and efficient staff and order management. This document provides a high-level overview of the core features and their functionalities.

## 1. Points System

The central currency within the CAFETERIA V2 ecosystem is the **points system**. Cafeterias operate using these points, which are acquired through a recharge workflow. Customers pay for their orders using these points, and the system tracks all point transactions.

-   **Point Acquisition**: Cafeterias acquire points by submitting recharge requests, typically involving a monetary payment that is converted into points.
-   **Point Redemption**: Customers use points to purchase menu items. The system automatically deducts points from the cafeteria's balance upon order closure.
-   **Balance Tracking**: Each cafeteria maintains a `pointsBalance` that is updated in real-time with recharges and order deductions.
-   **Grace Mode**: A special mode that allows cafeterias to continue operations even with a low or negative points balance, typically for a defined period or under specific conditions.

## 2. Recharge Workflow

The recharge workflow is the process by which cafeterias acquire points to operate. It involves a request, approval, and points allocation cycle.

-   **Request Creation**: A cafeteria (or its admin) initiates a recharge request, specifying the desired amount and optionally providing proof of payment (e.g., an image).
-   **Status Tracking**: Recharge requests move through various statuses: `pending`, `approved`, and `rejected`.
-   **Approval/Rejection**: An authorized user (e.g., Owner, Cafe Admin) reviews the request. Upon approval, the specified points are added to the cafeteria's balance. If rejected, a reason is provided.
-   **Commission Calculation**: Upon successful approval of a recharge request, the system triggers the commission distribution process, allocating commissions to relevant marketers.
-   **Ledger Entries**: All recharge-related transactions are recorded in the `ledgerEntries` table for auditing and financial tracking.

## 3. Commission Distribution

CAFETERIA V2 features a multi-level commission distribution system tied to the marketing hierarchy and cafeteria recharges.

-   **Marketer Hierarchy**: Marketers can have parent-child relationships, forming a hierarchical structure. Commissions can be distributed up this hierarchy.
-   **Commission Configurations**: Each marketer can have specific commission rates and expiry overrides defined in `commissionConfigs`.
-   **Distribution Logic**: When a cafeteria recharges, the system identifies the associated marketer(s) and calculates commissions based on predefined rates and the marketer hierarchy.
-   **Balance Management**: Marketers have `pendingBalance` (commissions awaiting availability) and `availableBalance` (commissions ready for withdrawal) tracked in `marketerBalances`.
-   **Commission Lifetime**: The `cafeteriaMarketerRelationships` table tracks the duration for which a marketer is eligible to receive commissions from a specific cafeteria.
-   **Free Operation Periods**: Cafeterias can have `freeOperationPeriods` during which no commissions are generated, often for promotional or initial setup phases.

## 4. Marketing Hierarchy

The system supports a hierarchical marketing structure to manage and incentivize marketers.

-   **Root Marketers**: Top-level marketers who may not have a parent.
-   **Parent-Child Relationships**: Marketers can recruit sub-marketers, forming a tree-like structure. This hierarchy is crucial for commission distribution.
-   **Reference Codes**: Unique `referenceCode`s are used for tracking and associating cafeterias with specific marketers.
-   **Currency Management**: Marketers can have a default currency, with options for overrides.

## 5. Staff Operations

CAFETERIA V2 provides robust tools for managing cafeteria staff and their daily operations.

-   **Staff Roles**: Defined roles include `manager`, `waiter`, and `chef`, each with specific permissions and dashboard access.
-   **Staff Assignment**: Staff members can be assigned to specific `sections` (for waiters) and `menuCategories` (for chefs) to streamline their work.
-   **Shift Management**: Staff can `startShift` and `endShift`, with the system tracking shift durations, sales, and orders processed during each shift.
-   **Performance Tracking**: The system aggregates `staffPerformance` metrics, including total sales, orders, items sold, and hours worked, for reporting purposes.

## 6. Order Lifecycle

The order lifecycle covers the entire process from order creation to closure, with distinct stages for kitchen preparation and service.

-   **Order Creation**: Waiters can `createOrder` for a specific `tableId` and `cafeteriaId`.
-   **Item Addition**: Menu items are added to an order, specifying `quantity` and `unitPrice`.
-   **Kitchen Workflow**: Order items can be `sent_to_kitchen`. Chefs then update the `status` of individual `orderItems` through `in_preparation` and `ready` stages.
-   **Order Item Statuses**: Each item in an order has a status (`pending`, `sent_to_kitchen`, `in_preparation`, `ready`, `served`, `cancelled`) to track its progress.
-   **Order Closure**: Once all items are served and the customer is ready to pay, the waiter can `closeOrder`. This deducts points from the cafeteria's balance and records the sale against the active shift.
-   **Order Completion Tracking**: The system tracks the completion status of an order, indicating how many items are ready or served.
-   **Ledger Entries**: Order closures result in `points_deduction` entries in the `ledgerEntries` table.
