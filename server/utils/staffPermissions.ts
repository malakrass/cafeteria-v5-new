/**
 * Staff Permissions Engine
 * Manages staff login permissions and access control
 *
 * Core Rules:
 * - Admin creates managers, waiters, chefs, tables, menu, sections
 * - Admin can allow/block manager login
 * - Admin or manager can allow/block waiter and chef login
 * - Staff cannot log in without permission
 * - Manager can see own reports + shift reports
 * - Waiters see only their assigned sections unless unrestricted
 * - Chefs see only assigned prep categories
 */

/**
 * Validate if a staff member can log in
 * @param canLogin - Staff login permission flag
 * @param role - Staff role
 * @returns true if staff can log in
 */
export function canStaffLogin(canLogin: boolean, role: string): boolean {
  return canLogin === true;
}

/**
 * Validate if a user can grant login permission
 * @param grantingUserRole - Role of user granting permission
 * @param targetStaffRole - Role of staff member
 * @returns true if permission can be granted
 */
export function canGrantLoginPermission(grantingUserRole: string, targetStaffRole: string): boolean {
  // Admin can grant to anyone
  if (grantingUserRole === "admin") {
    return true;
  }

  // Manager can grant to waiters and chefs (not managers)
  if (grantingUserRole === "manager") {
    return targetStaffRole === "waiter" || targetStaffRole === "chef";
  }

  // Waiters and chefs cannot grant permissions
  return false;
}

/**
 * Validate if a user can revoke login permission
 * @param revokingUserRole - Role of user revoking permission
 * @param targetStaffRole - Role of staff member
 * @returns true if permission can be revoked
 */
export function canRevokeLoginPermission(
  revokingUserRole: string,
  targetStaffRole: string
): boolean {
  // Same rules as granting
  return canGrantLoginPermission(revokingUserRole, targetStaffRole);
}

/**
 * Validate if a user can assign staff to sections
 * @param assigningUserRole - Role of user making assignment
 * @returns true if assignment is allowed
 */
export function canAssignToSections(assigningUserRole: string): boolean {
  // Only admin can assign sections
  return assigningUserRole === "admin";
}

/**
 * Validate if a user can assign staff to categories
 * @param assigningUserRole - Role of user making assignment
 * @returns true if assignment is allowed
 */
export function canAssignToCategories(assigningUserRole: string): boolean {
  // Only admin can assign categories
  return assigningUserRole === "admin";
}

/**
 * Get visible sections for a staff member
 * @param staffRole - Staff role
 * @param assignedSections - Array of section IDs assigned to staff
 * @param allSectionIds - Array of all section IDs in cafeteria
 * @returns Array of visible section IDs
 */
export function getVisibleSections(
  staffRole: string,
  assignedSections: string[],
  allSectionIds: string[]
): string[] {
  // Chefs and admins see all sections
  if (staffRole === "chef" || staffRole === "admin") {
    return allSectionIds;
  }

  // Waiters see only assigned sections
  if (staffRole === "waiter") {
    // If no sections assigned, waiter sees all (unrestricted)
    return assignedSections.length > 0 ? assignedSections : allSectionIds;
  }

  // Managers see all sections
  if (staffRole === "manager") {
    return allSectionIds;
  }

  return [];
}

/**
 * Get visible categories for a staff member
 * @param staffRole - Staff role
 * @param assignedCategories - Array of category IDs assigned to staff
 * @param allCategoryIds - Array of all category IDs in cafeteria
 * @returns Array of visible category IDs
 */
export function getVisibleCategories(
  staffRole: string,
  assignedCategories: string[],
  allCategoryIds: string[]
): string[] {
  // Waiters and admins see all categories
  if (staffRole === "waiter" || staffRole === "admin") {
    return allCategoryIds;
  }

  // Chefs see only assigned categories
  if (staffRole === "chef") {
    // If no categories assigned, chef sees all (unrestricted)
    return assignedCategories.length > 0 ? assignedCategories : allCategoryIds;
  }

  // Managers see all categories
  if (staffRole === "manager") {
    return allCategoryIds;
  }

  return [];
}

/**
 * Validate staff role
 * @param role - Staff role
 * @returns true if role is valid
 */
export function isValidStaffRole(role: string): boolean {
  const validRoles = ["admin", "manager", "waiter", "chef"];
  return validRoles.includes(role);
}

/**
 * Get role hierarchy level (higher = more permissions)
 * @param role - Staff role
 * @returns Hierarchy level (0-3, higher = more permissions)
 */
export function getRoleHierarchyLevel(role: string): number {
  const hierarchy: Record<string, number> = {
    admin: 3,
    manager: 2,
    waiter: 1,
    chef: 1,
  };
  return hierarchy[role] || 0;
}

/**
 * Check if one role can manage another
 * @param managingRole - Role of managing user
 * @param targetRole - Role of target user
 * @returns true if managing role can manage target role
 */
export function canManageRole(managingRole: string, targetRole: string): boolean {
  const managingLevel = getRoleHierarchyLevel(managingRole);
  const targetLevel = getRoleHierarchyLevel(targetRole);
  return managingLevel > targetLevel;
}

/**
 * Get default permissions for a role
 * @param role - Staff role
 * @returns Default permissions object
 */
export function getDefaultPermissionsForRole(role: string) {
  const defaults: Record<string, Record<string, boolean>> = {
    admin: {
      canLogin: false, // Must be explicitly granted
      canCreateStaff: true,
      canManageMenu: true,
      canManageTables: true,
      canManageSections: true,
      canViewReports: true,
      canManageStaffPermissions: true,
    },
    manager: {
      canLogin: false, // Must be explicitly granted
      canCreateStaff: true,
      canManageMenu: false,
      canManageTables: false,
      canManageSections: false,
      canViewReports: true,
      canManageStaffPermissions: true,
    },
    waiter: {
      canLogin: false, // Must be explicitly granted
      canCreateStaff: false,
      canManageMenu: false,
      canManageTables: false,
      canManageSections: false,
      canViewReports: false,
      canManageStaffPermissions: false,
    },
    chef: {
      canLogin: false, // Must be explicitly granted
      canCreateStaff: false,
      canManageMenu: false,
      canManageTables: false,
      canManageSections: false,
      canViewReports: false,
      canManageStaffPermissions: false,
    },
  };

  return defaults[role] || {};
}

/**
 * Format login permission status for display
 * @param canLogin - Login permission flag
 * @param grantedAt - When permission was granted
 * @param grantedBy - Who granted the permission
 * @returns Formatted status string
 */
export function formatLoginPermissionStatus(
  canLogin: boolean,
  grantedAt: Date | null,
  grantedBy: string | null
): string {
  if (!canLogin) {
    return "❌ Login Blocked";
  }

  if (grantedAt) {
    const date = new Date(grantedAt).toLocaleDateString();
    return `✅ Login Allowed (since ${date})`;
  }

  return "✅ Login Allowed";
}

/**
 * Get staff visibility restrictions
 * @param staffRole - Staff role
 * @returns Visibility restrictions object
 */
export function getStaffVisibilityRestrictions(staffRole: string) {
  const restrictions: Record<string, Record<string, boolean>> = {
    admin: {
      canSeeAllStaff: true,
      canSeeAllOrders: true,
      canSeeAllReports: true,
    },
    manager: {
      canSeeAllStaff: true,
      canSeeAllOrders: true,
      canSeeAllReports: true,
    },
    waiter: {
      canSeeAllStaff: false,
      canSeeAllOrders: false,
      canSeeAllReports: false,
    },
    chef: {
      canSeeAllStaff: false,
      canSeeAllOrders: false,
      canSeeAllReports: false,
    },
  };

  return restrictions[staffRole] || {};
}

/**
 * Validate staff assignment to section
 * @param staffRole - Staff role
 * @param sectionId - Section ID
 * @returns true if assignment is valid
 */
export function isValidStaffSectionAssignment(staffRole: string, sectionId: string): boolean {
  // Only waiters are assigned to sections
  return staffRole === "waiter" && sectionId !== null;
}

/**
 * Validate staff assignment to category
 * @param staffRole - Staff role
 * @param categoryId - Category ID
 * @returns true if assignment is valid
 */
export function isValidStaffCategoryAssignment(staffRole: string, categoryId: string): boolean {
  // Only chefs are assigned to categories
  return staffRole === "chef" && categoryId !== null;
}

/**
 * Get staff action capabilities
 * @param staffRole - Staff role
 * @returns Object with boolean flags for each action
 */
export function getStaffActionCapabilities(staffRole: string) {
  const capabilities: Record<string, Record<string, boolean>> = {
    admin: {
      createOrder: true,
      closeOrder: true,
      viewAllOrders: true,
      manageStaff: true,
      manageMenu: true,
      manageTables: true,
      viewReports: true,
      manageSections: true,
    },
    manager: {
      createOrder: true,
      closeOrder: true,
      viewAllOrders: true,
      manageStaff: true,
      manageMenu: false,
      manageTables: false,
      viewReports: true,
      manageSections: false,
    },
    waiter: {
      createOrder: true,
      closeOrder: true,
      viewAllOrders: false,
      manageStaff: false,
      manageMenu: false,
      manageTables: false,
      viewReports: false,
      manageSections: false,
    },
    chef: {
      createOrder: false,
      closeOrder: false,
      viewAllOrders: false,
      manageStaff: false,
      manageMenu: false,
      manageTables: false,
      viewReports: false,
      manageSections: false,
    },
  };

  return capabilities[staffRole] || {};
}
