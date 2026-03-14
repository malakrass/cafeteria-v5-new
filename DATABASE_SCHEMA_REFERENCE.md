# CAFETERIA V2 - Database Schema Reference

## Overview

This document provides a comprehensive reference for the CAFETERIA V2 database schema, which is managed using Drizzle ORM and designed for MySQL/TiDB. The schema comprises 24 tables, structured to support multi-role cafeteria management, a points system, recharge-based commissions, staff operations, and order processing.

## Table Definitions

### 1. `users` Table

**Description:** Stores user authentication and authorization information.

| Field Name   | Type                                 | Description                                    | Constraints / Indexes          |
| :----------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`         | `int`                                | Primary key, auto-incrementing                 | `PRIMARY KEY`, `AUTO_INCREMENT` |
| `openId`     | `varchar(64)`                        | Unique identifier from authentication provider | `NOT NULL`, `UNIQUE`, `idxOpenId` |
| `name`       | `text`                               | User's display name                            |                                |
| `email`      | `varchar(320)`                       | User's email address                           |                                |
| `loginMethod`| `varchar(64)`                        | Method used for login (e.g., Google, email)    |                                |
| `role`       | `enum('user', 'admin')`              | User's role in the system                      | `NOT NULL`, `DEFAULT 'user'`, `idxRole` |
| `createdAt`  | `timestamp`                          | Timestamp of user creation                     | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`, `idxCreatedAt` |
| `updatedAt`  | `timestamp`                          | Timestamp of last update                       | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |
| `lastSignedIn`| `timestamp`                          | Timestamp of last sign-in                      | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

### 2. `marketers` Table

**Description:** Manages marketer hierarchy and associated configurations.

| Field Name      | Type                                 | Description                                    | Constraints / Indexes          |
| :-------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`            | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `name`          | `varchar(255)`                       | Marketer's name                                | `NOT NULL`                     |
| `email`         | `varchar(320)`                       | Marketer's email                               |                                |
| `parentId`      | `varchar(36)`                        | ID of the parent marketer (for hierarchy)      | `idxParentId`                  |
| `isRoot`        | `boolean`                            | Indicates if the marketer is a root marketer   | `DEFAULT false`                |
| `referenceCode` | `varchar(50)`                        | Unique reference code for the marketer         | `UNIQUE`, `idxReferenceCode`   |
| `country`       | `varchar(2)`                         | Country code                                   |                                |
| `currency`      | `varchar(3)`                         | Default currency for the marketer              |                                |
| `currencyOverrideBy`| `varchar(36)`                      | ID of the marketer overriding currency         |                                |
| `createdAt`     | `timestamp`                          | Timestamp of marketer creation                 | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`, `idxCreatedAt` |

**Relationships:**
- Self-referencing: `parentId` refers to `marketers.id`.

### 3. `cafeterias` Table

**Description:** Stores information about each cafeteria, including points balance and grace mode status.

| Field Name           | Type                                 | Description                                    | Constraints / Indexes          |
| :------------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`                 | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `marketerId`         | `varchar(36)`                        | ID of the marketer associated with the cafeteria | `NOT NULL`, `idxMarketerId`    |
| `name`               | `varchar(255)`                       | Cafeteria's name                               | `NOT NULL`                     |
| `location`           | `varchar(255)`                       | Physical location of the cafeteria             |                                |
| `pointsBalance`      | `decimal(10, 2)`                     | Current points balance of the cafeteria        | `DEFAULT '0'`                  |
| `graceMode`          | `boolean`                            | Indicates if the cafeteria is in grace mode    | `DEFAULT false`                |
| `referenceCode`      | `varchar(50)`                        | Unique reference code for the cafeteria        | `UNIQUE`, `idxReferenceCode`   |
| `country`            | `varchar(2)`                         | Country code                                   |                                |
| `currency`           | `varchar(3)`                         | Default currency for the cafeteria             |                                |
| `currencyOverrideBy` | `varchar(36)`                        | ID of the entity overriding currency           |                                |
| `freeOperationEndDate`| `timestamp`                         | End date of free operation period              |                                |
| `createdAt`          | `timestamp`                          | Timestamp of cafeteria creation                | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`, `idxCreatedAt` |

**Relationships:**
- `marketerId` refers to `marketers.id`.

### 4. `commissionConfigs` Table

**Description:** Defines commission rates and expiry overrides for marketers.

| Field Name           | Type                                 | Description                                    | Constraints / Indexes          |
| :------------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`                 | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `marketerId`         | `varchar(36)`                        | ID of the marketer this config applies to      | `NOT NULL`, `idxMarketerId`    |
| `rate`               | `decimal(5, 2)`                      | Commission rate (e.g., 0.05 for 5%)            | `DEFAULT '0'`                  |
| `expiryOverrideMonths`| `int`                               | Number of months to override commission expiry |                                |
| `createdAt`          | `timestamp`                          | Timestamp of config creation                   | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `marketerId` refers to `marketers.id`.

### 5. `rechargeRequests` Table

**Description:** Tracks recharge requests made by cafeterias.

| Field Name               | Type                                 | Description                                    | Constraints / Indexes          |
| :----------------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`                     | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId`            | `varchar(36)`                        | ID of the cafeteria making the request         | `NOT NULL`, `idxCafeteriaId`   |
| `amount`                 | `decimal(10, 2)`                     | Amount of points requested                     | `NOT NULL`                     |
| `imageUrl`               | `text`                               | URL of the payment proof image                 |                                |
| `status`                 | `enum('pending', 'approved', 'rejected')` | Current status of the request                  | `DEFAULT 'pending'`, `idxStatus` |
| `processedAt`            | `timestamp`                          | Timestamp when the request was processed       |                                |
| `processedBy`            | `varchar(255)`                       | Name of the user who processed the request     |                                |
| `notes`                  | `text`                               | Additional notes for the request               |                                |
| `commissionCalculated`   | `boolean`                            | Indicates if commission has been calculated    | `DEFAULT false`                |
| `commissionDistributionId`| `varchar(36)`                       | ID of the associated commission distribution   |                                |
| `pointsAddedToBalance`   | `decimal(10, 2)`                     | Actual points added to balance                 | `DEFAULT '0'`                  |
| `createdAt`              | `timestamp`                          | Timestamp of request creation                  | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`, `idxCreatedAt` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.
- `commissionDistributionId` refers to `commissionDistributions.id`.

### 6. `marketerBalances` Table

**Description:** Stores the current balance of pending and available commissions for each marketer.

| Field Name       | Type                                 | Description                                    | Constraints / Indexes          |
| :--------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`             | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `marketerId`     | `varchar(36)`                        | ID of the marketer                             | `NOT NULL`, `UNIQUE`, `idxMarketerId` |
| `pendingBalance` | `decimal(15, 2)`                     | Commissions awaiting approval                  | `DEFAULT '0'`                  |
| `availableBalance`| `decimal(15, 2)`                     | Commissions available for withdrawal           | `DEFAULT '0'`                  |
| `totalWithdrawn` | `decimal(15, 2)`                     | Total amount of commissions withdrawn          | `DEFAULT '0'`                  |
| `lastUpdated`    | `timestamp`                          | Timestamp of last balance update               | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

**Relationships:**
- `marketerId` refers to `marketers.id`.

### 7. `commissionDistributions` Table

**Description:** Records the distribution of commissions for each recharge request.

| Field Name         | Type                                 | Description                                    | Constraints / Indexes          |
| :----------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`               | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `rechargeRequestId`| `varchar(36)`                        | ID of the associated recharge request          | `NOT NULL`, `idxRechargeRequestId` |
| `marketerId`       | `varchar(36)`                        | ID of the marketer receiving commission        | `NOT NULL`, `idxMarketerId`    |
| `level`            | `int`                                | Level in the marketer hierarchy                | `NOT NULL`                     |
| `commissionAmount` | `decimal(15, 2)`                     | Amount of commission distributed               | `NOT NULL`                     |
| `status`           | `enum('pending', 'available', 'withdrawn')` | Status of the commission                       | `DEFAULT 'pending'`, `idxStatus` |
| `createdAt`        | `timestamp`                          | Timestamp of commission distribution           | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `rechargeRequestId` refers to `rechargeRequests.id`.
- `marketerId` refers to `marketers.id`.

### 8. `cafeteriaMarketerRelationships` Table

**Description:** Tracks the commission lifetime relationship between cafeterias and marketers.

| Field Name             | Type                                 | Description                                    | Constraints / Indexes          |
| :--------------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`                   | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId`          | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `marketerId`           | `varchar(36)`                        | ID of the marketer                             | `NOT NULL`, `idxMarketerId`    |
| `commissionStartDate`  | `timestamp`                          | Start date for commission calculation          | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |
| `commissionExpiryDate` | `timestamp`                          | Expiry date for commission calculation         | `NOT NULL`, `idxExpiryDate`    |
| `isExpired`            | `boolean`                            | Indicates if the commission relationship is expired | `DEFAULT false`                |
| `createdAt`            | `timestamp`                          | Timestamp of relationship creation             | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`, `uniqueCafeteriaMarketer` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.
- `marketerId` refers to `marketers.id`.

### 9. `freeOperationPeriods` Table

**Description:** Records periods during which a cafeteria operates without commission charges.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId` | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `periodType`  | `enum('global_first_time', 'special_grant')` | Type of free operation period                  | `NOT NULL`                     |
| `startDate`   | `timestamp`                          | Start date of the free operation period        | `NOT NULL`                     |
| `endDate`     | `timestamp`                          | End date of the free operation period          | `NOT NULL`, `idxEndDate`       |
| `reason`      | `text`                               | Reason for the free operation period           |                                |
| `createdBy`   | `varchar(36)`                        | ID of the user who created the period          |                                |
| `createdAt`   | `timestamp`                          | Timestamp of period creation                   | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.

### 10. `ledgerEntries` Table

**Description:** A general ledger for all financial transactions and points movements.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `type`        | `varchar(255)`                       | Type of ledger entry (e.g., 'recharge_approved', 'order_closed') | `NOT NULL`, `idxType`          |
| `ledgerType`  | `enum('points_credit', 'points_deduction', 'commission_credit', 'commission_deduction')` | Category of the ledger entry                   | `NOT NULL`, `idxLedgerType`    |
| `description` | `text`                               | Description of the transaction                 |                                |
| `cafeteriaId` | `varchar(36)`                        | ID of the cafeteria involved                   | `idxCafeteriaId`               |
| `marketerId`  | `varchar(36)`                        | ID of the marketer involved                    | `idxMarketerId`                |
| `amount`      | `decimal(15, 2)`                     | Amount of the transaction                      | `NOT NULL`                     |
| `refId`       | `varchar(36)`                        | Reference ID to the source transaction (e.g., recharge request ID) | `idxRefId`                     |
| `createdAt`   | `timestamp`                          | Timestamp of ledger entry creation             | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`, `idxCreatedAt` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.
- `marketerId` refers to `marketers.id`.

### 11. `cafeteriaStaff` Table

**Description:** Manages staff members associated with each cafeteria.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId` | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `userId`      | `int`                                | ID of the associated user                      | `NOT NULL`, `UNIQUE`, `idxUserId` |
| `name`        | `varchar(255)`                       | Staff member's name                            | `NOT NULL`                     |
| `role`        | `enum('manager', 'waiter', 'chef')`  | Staff member's role                            | `NOT NULL`, `idxRole`          |
| `isActive`    | `boolean`                            | Indicates if the staff member is active        | `DEFAULT true`                 |
| `createdAt`   | `timestamp`                          | Timestamp of staff creation                    | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.
- `userId` refers to `users.id`.

### 12. `staffSections` Table

**Description:** Assigns staff members to specific sections within a cafeteria.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `staffId`     | `varchar(36)`                        | ID of the staff member                         | `NOT NULL`, `idxStaffId`       |
| `sectionId`   | `varchar(36)`                        | ID of the section                              | `NOT NULL`, `idxSectionId`     |
| `createdAt`   | `timestamp`                          | Timestamp of assignment                        | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`, `uniqueStaffSection` |

**Relationships:**
- `staffId` refers to `cafeteriaStaff.id`.
- `sectionId` refers to `sections.id`.

### 13. `staffCategories` Table

**Description:** Assigns staff members (e.g., chefs) to specific menu categories.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `staffId`     | `varchar(36)`                        | ID of the staff member                         | `NOT NULL`, `idxStaffId`       |
| `categoryId`  | `varchar(36)`                        | ID of the menu category                        | `NOT NULL`, `idxCategoryId`    |
| `createdAt`   | `timestamp`                          | Timestamp of assignment                        | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`, `uniqueStaffCategory` |

**Relationships:**
- `staffId` refers to `cafeteriaStaff.id`.
- `categoryId` refers to `menuCategories.id`.

### 14. `menuCategories` Table

**Description:** Defines categories for menu items.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId` | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `name`        | `varchar(255)`                       | Category name                                  | `NOT NULL`                     |
| `description` | `text`                               | Category description                           |                                |
| `createdAt`   | `timestamp`                          | Timestamp of category creation                 | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.

### 15. `menuItems` Table

**Description:** Stores individual menu items.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId` | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `categoryId`  | `varchar(36)`                        | ID of the menu category                        | `NOT NULL`, `idxCategoryId`    |
| `name`        | `varchar(255)`                       | Item name                                      | `NOT NULL`                     |
| `description` | `text`                               | Item description                               |                                |
| `price`       | `decimal(10, 2)`                     | Price of the item                              | `NOT NULL`                     |
| `imageUrl`    | `text`                               | URL of the item's image                        |                                |
| `isAvailable` | `boolean`                            | Indicates if the item is currently available   | `DEFAULT true`                 |
| `createdAt`   | `timestamp`                          | Timestamp of item creation                     | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.
- `categoryId` refers to `menuCategories.id`.

### 16. `sections` Table

**Description:** Defines sections within a cafeteria (e.g., 
dining area, bar).

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId` | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `name`        | `varchar(255)`                       | Section name                                   | `NOT NULL`                     |
| `description` | `text`                               | Section description                            |                                |
| `createdAt`   | `timestamp`                          | Timestamp of section creation                  | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.

### 17. `tables` Table

**Description:** Stores information about individual tables within cafeteria sections.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId` | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `sectionId`   | `varchar(36)`                        | ID of the section the table belongs to         | `NOT NULL`, `idxSectionId`     |
| `tableNumber` | `int`                                | Unique number for the table within its section | `NOT NULL`                     |
| `capacity`    | `int`                                | Seating capacity of the table                  | `NOT NULL`                     |
| `status`      | `enum("available", "occupied", "reserved", "maintenance")` | Current status of the table                    | `DEFAULT "available"`, `idxStatus` |
| `createdAt`   | `timestamp`                          | Timestamp of table creation                    | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.
- `sectionId` refers to `sections.id`.

### 18. `orders` Table

**Description:** Records customer orders.

| Field Name     | Type                                 | Description                                    | Constraints / Indexes          |
| :------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`           | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId`  | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `tableId`      | `varchar(36)`                        | ID of the table the order is for               | `idxTableId`                   |
| `waiterId`     | `varchar(36)`                        | ID of the waiter who took the order            | `idxWaiterId`                  |
| `status`       | `enum("open", "closed", "cancelled")` | Current status of the order                    | `DEFAULT "open"`, `idxStatus`  |
| `totalAmount`  | `decimal(15, 2)`                     | Total monetary amount of the order             | `DEFAULT "0"`                  |
| `pointsConsumed`| `decimal(15, 2)`                     | Total points consumed for the order            | `DEFAULT "0"`                  |
| `createdAt`    | `timestamp`                          | Timestamp of order creation                    | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |
| `closedAt`     | `timestamp`                          | Timestamp when the order was closed            |                                |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.
- `tableId` refers to `tables.id`.
- `waiterId` refers to `cafeteriaStaff.id`.

### 19. `orderItems` Table

**Description:** Details individual items within an order.

| Field Name      | Type                                 | Description                                    | Constraints / Indexes          |
| :-------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`            | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `orderId`       | `varchar(36)`                        | ID of the parent order                         | `NOT NULL`, `idxOrderId`       |
| `menuItemId`    | `varchar(36)`                        | ID of the menu item                            | `NOT NULL`, `idxMenuItemId`    |
| `quantity`      | `int`                                | Quantity of the item                           | `NOT NULL`                     |
| `unitPrice`     | `decimal(10, 2)`                     | Price per unit of the item                     | `NOT NULL`                     |
| `totalPrice`    | `decimal(10, 2)`                     | Total price for this item (quantity * unitPrice) | `NOT NULL`                     |
| `status`        | `enum("pending", "sent_to_kitchen", "in_preparation", "ready", "served", "cancelled")` | Current status of the order item               | `DEFAULT "pending"`, `idxStatus` |
| `notes`         | `text`                               | Special notes or requests for the item         |                                |
| `createdAt`     | `timestamp`                          | Timestamp of item addition                     | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |
| `sentToKitchenAt`| `timestamp`                         | Timestamp when item was sent to kitchen        |                                |
| `readyAt`       | `timestamp`                          | Timestamp when item was marked ready           |                                |
| `servedAt`      | `timestamp`                          | Timestamp when item was served                 |                                |

**Relationships:**
- `orderId` refers to `orders.id`.
- `menuItemId` refers to `menuItems.id`.

### 20. `shifts` Table

**Description:** Tracks staff work shifts.

| Field Name     | Type                                 | Description                                    | Constraints / Indexes          |
| :------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`           | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId`  | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `staffId`      | `varchar(36)`                        | ID of the staff member                         | `NOT NULL`, `idxStaffId`       |
| `startTime`    | `timestamp`                          | Start time of the shift                        | `NOT NULL`, `idxStartTime`     |
| `endTime`      | `timestamp`                          | End time of the shift                          |                                |
| `status`       | `enum("active", "completed", "cancelled")` | Current status of the shift                    | `DEFAULT "active"`, `idxStatus` |
| `totalSales`   | `decimal(15, 2)`                     | Total sales generated during the shift         | `DEFAULT "0"`                  |
| `totalOrders`  | `int`                                | Total orders processed during the shift        | `DEFAULT 0`                    |
| `totalItemsSold`| `int`                               | Total items sold during the shift              | `DEFAULT 0`                    |
| `createdAt`    | `timestamp`                          | Timestamp of shift creation                    | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.
- `staffId` refers to `cafeteriaStaff.id`.

### 21. `shiftSales` Table

**Description:** Records sales transactions linked to specific shifts.

| Field Name       | Type                                 | Description                                    | Constraints / Indexes          |
| :--------------- | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`             | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `shiftId`        | `varchar(36)`                        | ID of the shift                                | `NOT NULL`, `idxShiftId`       |
| `orderId`        | `varchar(36)`                        | ID of the order associated with the sale       | `NOT NULL`, `idxOrderId`       |
| `amount`         | `decimal(10, 2)`                     | Monetary amount of the sale                    | `NOT NULL`                     |
| `pointsDeducted` | `decimal(10, 2)`                     | Points deducted for this sale                  | `NOT NULL`                     |
| `createdAt`      | `timestamp`                          | Timestamp of sale record creation              | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `shiftId` refers to `shifts.id`.
- `orderId` refers to `orders.id`.

### 22. `cafeteriaReports` Table

**Description:** Stores aggregated daily, weekly, or monthly reports for cafeterias.

| Field Name          | Type                                 | Description                                    | Constraints / Indexes          |
| :------------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`                | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `cafeteriaId`       | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `reportType`        | `enum("daily", "weekly", "monthly")` | Type of report                                 | `NOT NULL`, `idxReportType`    |
| `reportDate`        | `timestamp`                          | Date the report pertains to                    | `NOT NULL`, `idxReportDate`    |
| `totalSales`        | `decimal(15, 2)`                     | Total sales for the report period              | `DEFAULT "0"`                  |
| `totalOrders`       | `int`                                | Total orders for the report period             | `DEFAULT 0`                    |
| `totalItemsSold`    | `int`                                | Total items sold for the report period         | `DEFAULT 0`                    |
| `totalPointsDeducted`| `decimal(15, 2)`                     | Total points deducted for the report period    | `DEFAULT "0"`                  |
| `averageOrderValue` | `decimal(10, 2)`                     | Average order value for the report period      | `DEFAULT "0"`                  |
| `generatedAt`       | `timestamp`                          | Timestamp when the report was generated        | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `cafeteriaId` refers to `cafeterias.id`.

### 23. `staffPerformance` Table

**Description:** Stores aggregated staff performance metrics.

| Field Name          | Type                                 | Description                                    | Constraints / Indexes          |
| :------------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`                | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `staffId`           | `varchar(36)`                        | ID of the staff member                         | `NOT NULL`, `idxStaffId`       |
| `cafeteriaId`       | `varchar(36)`                        | ID of the cafeteria                            | `NOT NULL`, `idxCafeteriaId`   |
| `reportDate`        | `timestamp`                          | Date the performance report pertains to        | `NOT NULL`, `idxReportDate`    |
| `totalShifts`       | `int`                                | Total shifts worked                            | `DEFAULT 0`                    |
| `totalSales`        | `decimal(15, 2)`                     | Total sales generated by staff                 | `DEFAULT "0"`                  |
| `totalOrders`       | `int`                                | Total orders processed by staff                | `DEFAULT 0`                    |
| `averageOrderValue` | `decimal(10, 2)`                     | Average order value by staff                   | `DEFAULT "0"`                  |
| `totalItemsSold`    | `int`                                | Total items sold by staff                      | `DEFAULT 0`                    |
| `totalHoursWorked`  | `decimal(8, 2)`                      | Total hours worked by staff                    | `DEFAULT "0"`                  |
| `generatedAt`       | `timestamp`                          | Timestamp when the report was generated        | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |

**Relationships:**
- `staffId` refers to `cafeteriaStaff.id`.
- `cafeteriaId` refers to `cafeterias.id`.

## 24. `systemSettings` Table

**Description:** Stores system-wide configuration settings.

| Field Name    | Type                                 | Description                                    | Constraints / Indexes          |
| :------------ | :----------------------------------- | :--------------------------------------------- | :----------------------------- |
| `id`          | `varchar(36)`                        | Primary key                                    | `PRIMARY KEY`                  |
| `settingKey`  | `varchar(255)`                       | Unique key for the setting                     | `NOT NULL`, `UNIQUE`           |
| `settingValue`| `json`                               | Value of the setting (JSON format)             | `NOT NULL`                     |
| `description` | `text`                               | Description of the setting                     |                                |
| `createdAt`   | `timestamp`                          | Timestamp of setting creation                  | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` |
| `updatedAt`   | `timestamp`                          | Timestamp of last update                       | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

## Indexes and Constraints

All tables utilize primary keys (`PRIMARY KEY`) for unique identification. Foreign key relationships are implicitly managed by the application logic and Drizzle ORM, ensuring data integrity. Several tables also include specific indexes (`idx...`) to optimize query performance on frequently accessed columns. Unique constraints (`UNIQUE`) are applied where necessary to enforce data uniqueness, such as for `openId` in the `users` table and `referenceCode` in `marketers` and `cafeterias` tables. Composite unique indexes, like `uniqueCafeteriaMarketer`, prevent duplicate entries for specific relationships.
