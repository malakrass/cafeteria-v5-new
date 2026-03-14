/**
 * Table Engine - Table and Section Management
 * Handles table assignments, section organization, and table status
 */

import type { CafeteriaTable, Section } from "../../drizzle/schema";

/**
 * Get tables by section
 */
export function getTablesBySection(
  tables: CafeteriaTable[],
  sectionId: string
): CafeteriaTable[] {
  return tables.filter((table) => table.sectionId === sectionId);
}

/**
 * Get available tables in section
 */
export function getAvailableTablesInSection(
  tables: CafeteriaTable[],
  sectionId: string
): CafeteriaTable[] {
  return tables.filter(
    (table) => table.sectionId === sectionId && table.status === "available"
  );
}

/**
 * Get occupied tables in section
 */
export function getOccupiedTablesInSection(
  tables: CafeteriaTable[],
  sectionId: string
): CafeteriaTable[] {
  return tables.filter(
    (table) => table.sectionId === sectionId && table.status === "occupied"
  );
}

/**
 * Get available tables by capacity
 */
export function getAvailableTablesByCapacity(
  tables: CafeteriaTable[],
  requiredCapacity: number
): CafeteriaTable[] {
  return tables.filter(
    (table) =>
      table.status === "available" && (table.capacity || 0) >= requiredCapacity
  );
}

/**
 * Get best fit table for party size
 */
export function getBestFitTable(
  tables: CafeteriaTable[],
  partySize: number
): CafeteriaTable | undefined {
  const availableTables = getAvailableTablesByCapacity(tables, partySize);
  if (availableTables.length === 0) return undefined;

  // Sort by capacity ascending to get smallest fitting table
  return availableTables.sort((a, b) => (a.capacity || 0) - (b.capacity || 0))[0];
}

/**
 * Get section statistics
 */
export function getSectionStats(
  tables: CafeteriaTable[],
  section: Section
): {
  sectionId: string;
  sectionName: string;
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  totalCapacity: number;
  occupancyRate: number;
} {
  const sectionTables = getTablesBySection(tables, section.id);
  const availableTables = getAvailableTablesInSection(tables, section.id);
  const occupiedTables = getOccupiedTablesInSection(tables, section.id);
  const totalCapacity = sectionTables.reduce((sum, table) => sum + (table.capacity || 0), 0);
  const occupancyRate =
    sectionTables.length > 0
      ? (occupiedTables.length / sectionTables.length) * 100
      : 0;

  return {
    sectionId: section.id,
    sectionName: section.name,
    totalTables: sectionTables.length,
    availableTables: availableTables.length,
    occupiedTables: occupiedTables.length,
    totalCapacity,
    occupancyRate,
  };
}

/**
 * Get cafeteria occupancy overview
 */
export function getCafeteriaOccupancy(
  tables: CafeteriaTable[],
  sections: Section[]
): {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  totalCapacity: number;
  occupancyRate: number;
  sectionStats: ReturnType<typeof getSectionStats>[];
} {
  const availableTables = tables.filter((t) => t.status === "available");
  const occupiedTables = tables.filter((t) => t.status === "occupied");
  const totalCapacity = tables.reduce((sum, table) => sum + (table.capacity || 0), 0);
  const occupancyRate = tables.length > 0 ? (occupiedTables.length / tables.length) * 100 : 0;
  const sectionStats = sections.map((section) => getSectionStats(tables, section));

  return {
    totalTables: tables.length,
    availableTables: availableTables.length,
    occupiedTables: occupiedTables.length,
    totalCapacity,
    occupancyRate,
    sectionStats,
  };
}

/**
 * Validate table data
 */
export function validateTableData(
  tableNumber: number,
  capacity: number,
  sectionId: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (tableNumber <= 0) {
    errors.push("Table number must be greater than 0");
  }

  if (capacity <= 0) {
    errors.push("Capacity must be greater than 0");
  }

  if (!sectionId || sectionId.trim().length === 0) {
    errors.push("Section is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate section data
 */
export function validateSectionData(
  name: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push("Section name is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get table status distribution
 */
export function getTableStatusDistribution(
  tables: CafeteriaTable[]
): Record<string, number> {
  const distribution: Record<string, number> = {
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0,
  };

  tables.forEach((table) => {
    const status = table.status || "available";
    if (status in distribution) {
      distribution[status]++;
    }
  });

  return distribution;
}

/**
 * Get tables needing maintenance
 */
export function getTablesNeedingMaintenance(tables: CafeteriaTable[]): CafeteriaTable[] {
  return tables.filter((table) => table.status === "cleaning");
}

/**
 * Get reserved tables
 */
export function getReservedTables(tables: CafeteriaTable[]): CafeteriaTable[] {
  return tables.filter((table) => table.status === "reserved");
}

/**
 * Calculate average table capacity
 */
export function getAverageTableCapacity(tables: CafeteriaTable[]): number {
  if (tables.length === 0) return 0;
  const totalCapacity = tables.reduce((sum, table) => sum + (table.capacity || 0), 0);
  return totalCapacity / tables.length;
}

/**
 * Get largest table capacity
 */
export function getLargestTableCapacity(tables: CafeteriaTable[]): number {
  if (tables.length === 0) return 0;
  return Math.max(...tables.map((t) => t.capacity || 0));
}

/**
 * Get smallest table capacity
 */
export function getSmallestTableCapacity(tables: CafeteriaTable[]): number {
  if (tables.length === 0) return 0;
  return Math.min(...tables.map((t) => t.capacity || 0));
}
