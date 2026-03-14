# CAFETERIA V2 - System Architecture

## 1. Overview

The CAFETERIA V2 system is a comprehensive, multi-role management solution designed for cafeterias. It features a robust backend for data management and business logic, and a dynamic, mobile-first frontend for various user roles. The system is built with a focus on scalability, maintainability, and a rich user experience.

## 2. High-Level Architecture

The system follows a client-server architecture, with a clear separation of concerns between the frontend (client) and the backend (server). Communication between the two layers is facilitated by tRPC, ensuring end-to-end type safety.

```mermaid
graph TD
    A[Client Applications] -->|tRPC API Calls| B(Backend Server)
    B --> C(Database)
    B --> D(External Services)

    subgraph Client Applications
        E[Manager Dashboard]
        F[Waiter Dashboard]
        G[Chef Dashboard]
        H[Reporting Dashboard]
    end

    subgraph Backend Server
        I[tRPC Routers]
        J[Business Logic Engines]
        K[Database Access Layer]
    end

    subgraph Database
        L[MySQL/TiDB]
    end

    subgraph External Services
        M[Authentication Providers]
        N[Image Storage (S3)]
        O[LLM/AI Services]
    end

    E --> I
    F --> I
    G --> I
    H --> I
    I --> J
    J --> K
    K --> L
    J --> D
```

## 3. Backend Layers

The backend is built using Node.js and tRPC, providing a type-safe API layer over a Drizzle ORM-managed MySQL/TiDB database. It is structured into several key components:

### 3.1. tRPC Routers

These define the API endpoints and their input/output schemas using Zod for validation. Each router groups related procedures (queries and mutations) for specific domains.

| Router Name    | Description                                       | Key Procedures                                   |
| :------------- | :------------------------------------------------ | :----------------------------------------------- |
| `authRouter`   | Handles user authentication and session management | `me`, `logout`                                   |
| `ordersRouter` | Manages order creation, item addition, and status updates | `createOrder`, `addItem`, `updateItemStatus`, `closeOrder`, `getOrders`, `getKitchenOrders` |
| `shiftsRouter` | Manages staff shifts, including start/end and metrics | `startShift`, `endShift`, `getShift`, `getStaffShifts`, `getCafeteriaShifts` |
| `reportingRouter` | Generates various cafeteria reports and analytics | `generateDailyReport`, `getReport`, `getCafeteriaReports`, `getSalesComparison`, `getTopItemsReport`, `getTopStaffReport` |
| `menuRouter`   | Manages menu categories and individual menu items  | `createCategory`, `getCategories`, `createMenuItem`, `getMenuItems`, `updateItemAvailability`, `getMenuSummary` |
| `tablesRouter` | Manages cafeteria sections and tables             | `createSection`, `getSections`, `createTable`, `getTables`, `updateTableStatus`, `getCafeteriaOccupancy` |
| `rechargesRouter` | Handles recharge requests and cafeteria points balance | `createRequest`, `getRequests`, `approveRequest`, `rejectRequest`, `getCafeteriaDetails` |
| `staffRouter`  | Manages staff members, roles, and assignments     | `createStaff`, `getStaff`, `grantLoginPermission`, `assignToSection`, `getAssignedSections`, `assignToCategory`, `getAssignedCategories` |

### 3.2. Business Logic Engines (`server/utils`)

These modules encapsulate complex business rules and calculations, ensuring consistency and reusability across different API procedures. Examples include:

- **`commissionEngine.ts`**: Handles commission calculations and distribution logic.
- **`currencyEngine.ts`**: Manages currency formatting and conversions.
- **`freeOperationEngine.ts`**: Determines free operation periods for cafeterias.
- **`menuEngine.ts`**: Provides utilities for menu item organization and summarization.
- **`orderEngine.ts`**: Contains logic for order bill calculation, points conversion, and status transitions.
- **`reportingEngine.ts`**: Implements various reporting calculations like total sales, average order value, and top-selling items.
- **`shiftEngine.ts`**: Manages shift durations, sales tracking, and staff performance metrics.
- **`staffPermissions.ts`**: Defines role-based access control and permission checks for staff operations.
- **`tableEngine.ts`**: Calculates table occupancy, status distribution, and best-fit table suggestions.

### 3.3. Database Access Layer (`server/db.ts`)

This module provides a centralized interface for interacting with the MySQL/TiDB database using Drizzle ORM. It includes functions for common CRUD operations and complex queries, abstracting away the underlying database details from the tRPC routers and business logic engines.

### 3.4. Core Utilities (`server/_core`)

This directory contains foundational utilities and configurations for the backend, such as tRPC context creation, environment variables, and SDK integrations for external services.

## 4. Frontend Layers

The frontend is built with React and TypeScript, leveraging Vite for a fast development experience. It emphasizes a mobile-first design approach and uses shadcn/ui for accessible and customizable UI components.

### 4.1. Pages (`client/src/pages`)

These are the main entry points for different dashboards and views, each corresponding to a specific user role or functionality.

- **`Home.tsx`**: The landing page of the application.
- **`ManagerDashboard.tsx`**: Provides an overview for managers, including occupancy, sales, menu statistics, and points balance.
- **`WaiterDashboard.tsx`**: Designed for waiters to manage tables, create orders, and track shifts.
- **`ChefDashboard.tsx`**: A kitchen display system optimized for landscape mode, showing incoming orders and allowing status updates.
- **`ReportingDashboard.tsx`**: Offers various reports and analytics for cafeteria performance, staff, and occupancy.
- **`NotFound.tsx`**: Generic 404 error page.

### 4.2. Components (`client/src/components`)

This directory houses reusable UI components, ranging from atomic elements (e.g., buttons, cards from shadcn/ui) to more complex, domain-specific components (e.g., `DashboardMetricCard`).

- **`DashboardMetricCard.tsx`**: A versatile card component for displaying key performance indicators with titles, values, subtitles, and optional icons/trends.
- **`ui/`**: Contains components from shadcn/ui, providing a consistent design system.
- **Other Components**: Specific components for each dashboard, such as `SectionTabs`, `TableGrid`, `OrderForm`, `OrderQueue`, `OrderTicket`, `CategoryFilter`, `DateRangeFilter`, etc.

### 4.3. Utilities (`client/src/lib`)

Frontend-specific utility functions that aid in data formatting, calculations, and API interactions.

- **`dashboardUtils.ts`**: Contains helper functions for formatting currency, points, percentages, durations, and dates, as well as calculating occupancy and determining status colors.
- **`trpc.ts`**: Initializes the tRPC client for seamless communication with the backend API.
- **`utils.ts`**: General utility functions.

### 4.4. Hooks (`client/src/hooks`)

Custom React hooks for encapsulating reusable logic, such as authentication (`useAuth`) and potentially data fetching or state management for specific features.

## 5. Data Flow and Integration

Frontend components interact with the backend via tRPC queries and mutations. The `useAuth` hook manages user authentication and provides user context, including `cafeteriaId` and `staffId`, which are crucial for fetching role-specific data. Data is fetched asynchronously, and loading/error states are handled gracefully in the UI.

## 6. External Dependencies

- **React 19**: Frontend framework.
- **tRPC**: Type-safe API layer.
- **Drizzle ORM**: Database toolkit for TypeScript.
- **MySQL/TiDB**: Primary database for persistent storage.
- **Zod**: Schema validation library.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **shadcn/ui**: Reusable UI components built with Tailwind CSS and React.
- **Lucide React**: Icon library.
- **Recharts**: (Planned for reporting) Composable charting library built with React and D3.
- **Wouter**: Small routing library for React.
- **Nanoid**: Small, secure, URL-friendly, unique string ID generator.

## 7. Mobile-First Design Principles

All dashboards are designed with a mobile-first approach, ensuring optimal usability on small screens before scaling up to larger displays. Key aspects include:

- **Responsive Layouts**: Achieved using Tailwind CSS's responsive utilities.
- **Touch-Friendly Elements**: Large buttons and clear spacing for easy interaction on touch devices.
- **Vertical Scrolling**: Primary navigation and content flow are designed for vertical scrolling.
- **Sticky Headers**: Used where appropriate to keep important information visible.
- **Role-Specific Orientations**: Portrait mode for most roles, with a dedicated landscape optimization for the Chef Dashboard (Kitchen Display System).
