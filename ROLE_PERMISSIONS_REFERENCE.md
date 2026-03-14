# CAFETERIA V2 - Role Permissions Reference

## Overview

This document outlines the role-based access control (RBAC) within the CAFETERIA V2 system. Each user is assigned a specific role, which dictates their permissible actions and access to various functionalities and data. The system is designed to ensure that users only have access to the information and operations necessary for their responsibilities.

## Defined Roles

The CAFETERIA V2 system defines the following primary roles:

1.  **Owner**: The top-level administrator with full control over the system, including marketer and cafeteria management.
2.  **Marketer**: Responsible for managing cafeterias, commissions, and their sub-marketers.
3.  **Cafe Admin**: Manages a specific cafeteria, including staff, menu, tables, and reports.
4.  **Manager**: Oversees daily cafeteria operations, including shifts, orders, and basic reporting.
5.  **Waiter**: Primarily handles table management, order taking, and order processing.
6.  **Chef**: Manages kitchen operations, focusing on order item preparation and status updates.

## Role-Based Permissions Matrix

The following table details the permissions for each role across different system entities and functionalities.

| Feature/Entity        | Owner     | Marketer  | Cafe Admin | Manager   | Waiter    | Chef      |
| :-------------------- | :-------- | :-------- | :--------- | :-------- | :-------- | :-------- |
| **User Management**   |           |           |            |           |           |           |
| View Users            | Full      | -         | -          | -         | -         | -         |
| Create/Edit Users     | Full      | -         | -          | -         | -         | -         |
| **Marketer Management**|
| View Marketers        | Full      | Own/Sub   | -          | -         | -         | -         |
| Create/Edit Marketers | Full      | Sub-Only  | -          | -         | -         | -         |
| Manage Commissions    | Full      | Own       | -          | -         | -         | -         |
| **Cafeteria Management**|
| View Cafeterias       | Full      | Own       | Own        | -         | -         | -         |
| Create/Edit Cafeterias| Full      | Own       | -          | -         | -         | -         |
| Manage Points Balance | Full      | -         | Own        | -         | -         | -         |
| Manage Grace Mode     | Full      | -         | Own        | -         | -         | -         |
| **Recharge Requests** |
| Create Request        | -         | -         | Own        | -         | -         | -         |
| View Requests         | Full      | Own       | Own        | -         | -         | -         |
| Approve/Reject Request| Full      | -         | Own        | -         | -         | -         |
| **Staff Management**  |
| View Staff            | -         | -         | Own        | Own       | -         | -         |
| Create/Edit Staff     | -         | -         | Own        | -         | -         | -         |
| Assign Sections/Categories| -     | -         | Own        | -         | -         | -         |
| **Menu Management**   |
| View Menu Categories  | -         | -         | Own        | Own       | Own       | Own       |
| Create/Edit Categories| -         | -         | Own        | -         | -         | -         |
| View Menu Items       | -         | -         | Own        | Own       | Own       | Own       |
| Create/Edit Items     | -         | -         | Own        | -         | -         | -         |
| Update Item Availability| -       | -         | Own        | Own       | -         | -         |
| **Table Management**  |
| View Sections         | -         | -         | Own        | Own       | Own       | -         |
| Create/Edit Sections  | -         | -         | Own        | -         | -         | -         |
| View Tables           | -         | -         | Own        | Own       | Own       | -         |
| Create/Edit Tables    | -         | -         | Own        | -         | -         | -         |
| Update Table Status   | -         | -         | Own        | Own       | Own       | -         |
| **Order Management**  |
| Create Order          | -         | -         | -          | -         | Own       | -         |
| Add Item to Order     | -         | -         | -          | -         | Own       | -         |
| Update Item Status    | -         | -         | -          | -         | -         | Own       |
| Close Order           | -         | -         | -          | -         | Own       | -         |
| View Orders           | Full      | -         | Own        | Own       | Own       | Own (Kitchen) |
| **Shift Management**  |
| Start/End Shift       | -         | -         | -          | Own       | Own       | Own       |
| View Shifts           | Full      | -         | Own        | Own       | Own       | Own       |
| **Reporting & Analytics**|
| View Sales Reports    | Full      | -         | Own        | Own       | -         | -         |
| View Staff Performance| Full      | -         | Own        | Own       | -         | -         |
| View Occupancy Reports| Full      | -         | Own        | Own       | -         | -         |

**Legend:**
- **Full**: Full access and control.
- **Own**: Access and control limited to entities directly associated with the user (e.g., a Marketer can only manage their own cafeterias).
- **Sub-Only**: Can only create/edit entities under their direct hierarchy (e.g., a Marketer can only create sub-marketers).
- **Own (Kitchen)**: Can view orders relevant to kitchen operations.
- **-**: No direct access or control over this feature/entity.

## Implementation Details

Permissions are enforced at the backend through tRPC procedures, utilizing the `protectedProcedure` and `ctx.user` object to determine the authenticated user's role and associated `cafeteriaId` or `staffId`. This ensures that all API calls are authorized based on the user's role and context. Frontend dashboards dynamically adjust their UI elements and available actions based on the logged-in user's role, providing a tailored experience for each user type.
