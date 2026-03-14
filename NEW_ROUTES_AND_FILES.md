# New Routes and Files Report

## New Frontend Routes
| Route | Component | Description |
| :--- | :--- | :--- |
| `/menu/:tableToken` | `CustomerMenu.tsx` | Public customer menu page for QR ordering |

## New Backend Endpoints
| Router | Endpoint | Description |
| :--- | :--- | :--- |
| `qrOrders` | `resolveTableByToken` | Public: Resolves table details from a QR token |
| `qrOrders` | `createCustomerOrder` | Public: Creates a customer order from a QR scan |
| `staff` | `updateStaffRole` | Protected: Updates a staff member's role and permissions |
| `staff` | `toggleStaffLogin` | Protected: Enables or disables staff login access |
| `orders` | `getWaiterOrders` | Protected: Retrieves open orders for the waiter dashboard |
| `orders` | `getChefOrders` | Protected: Retrieves kitchen-bound items for the chef dashboard |

## New Files Created
| File Path | Description |
| :--- | :--- |
| `client/src/pages/CustomerMenu.tsx` | Customer-facing menu and ordering page |
| `client/src/components/StaffManagement.tsx` | Staff role and access management component |
| `server/routers/qr-orders.ts` | Backend router for QR-based ordering |
| `drizzle/0003_qr_workflow.sql` | Database migration for new fields and indexes |

## Modified Files
| File Path | Description |
| :--- | :--- |
| `drizzle/schema.ts` | Added `tableToken`, `source`, and `permissions` fields |
| `server/routers.ts` | Registered the new `qrOrdersRouter` |
| `server/routers/tables.ts` | Added `tableToken` generation and response |
| `server/routers/staff.ts` | Added role and login management endpoints |
| `server/routers/orders.ts` | Added waiter and chef dashboard endpoints |
| `client/src/App.tsx` | Registered the new customer menu route |
| `client/src/pages/ManagerDashboard.tsx` | Integrated staff management UI |
