import { and, eq, like, sql } from "drizzle-orm";
import { getDb } from "../db";
import { cafeterias, marketers } from "../../drizzle/schema";

export enum ReferenceCodePrefix {
  OWNER = "OWN",
  MARKETER = "MKT",
  CAFETERIA = "P",
  TABLE = "T",
  WAITER = "W",
}

export enum EntityType {
  OWNER = "owner",
  MARKETER = "marketer",
  CAFETERIA = "cafeteria",
}

/**
 * Generates an initial reference code for a top-level entity (Owner or Marketer).
 * @param type The type of entity (OWNER or MARKETER).
 * @returns A new reference code.
 */
export async function generateInitialReferenceCode(type: EntityType.OWNER | EntityType.MARKETER): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const prefix = type === EntityType.OWNER ? ReferenceCodePrefix.OWNER : ReferenceCodePrefix.MARKETER;
  const existingCodes = await db.select({ code: marketers.referenceCode }).from(marketers)
    .where(like(marketers.referenceCode, `${prefix}-%`));

  let nextId = 1;
  if (existingCodes.length > 0) {
    const maxId = existingCodes.reduce((max: number, current: any) => {
      const idPart = parseInt(current.code.split('-')[1]);
      return isNaN(idPart) ? max : Math.max(max, idPart);
    }, 0);
    nextId = maxId + 1;
  }
  return `${prefix}-${String(nextId).padStart(2, '0')}`;
}

/**
 * Generates a child reference code based on a parent's code.
 * Enforces 2-digit suffix and 99-child limit.
 * @param parentCode The reference code of the parent entity.
 * @param childType The type of child entity (MARKETER or CAFETERIA).
 * @returns A new hierarchical reference code.
 * @throws Error if 99-child limit is reached or parent code is invalid.
 */
export async function generateChildReferenceCode(
  parentCode: string,
  childType: EntityType.MARKETER | EntityType.CAFETERIA
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const childPrefix = childType === EntityType.MARKETER ? ReferenceCodePrefix.MARKETER : ReferenceCodePrefix.CAFETERIA;

  // Determine the table to query based on childType
  const targetTable = childType === EntityType.MARKETER ? marketers : cafeterias;

  const existingChildren = await db.select({ code: targetTable.referenceCode }).from(targetTable)
    .where(and(
      like(targetTable.referenceCode, `${parentCode}%`),
      sql`LENGTH(${targetTable.referenceCode}) = LENGTH(${parentCode}) + 2`
    ));

  let nextSuffix = 1;
  if (existingChildren.length > 0) {
    const maxSuffix = existingChildren.reduce((max: number, current: any) => {
      const suffix = current.code.substring(parentCode.length);
      if (suffix.length === 2 && !isNaN(parseInt(suffix))) {
        return Math.max(max, parseInt(suffix));
      }
      return max;   }, 0);
    nextSuffix = maxSuffix + 1;
  }

  if (nextSuffix > 99) {
    throw new Error(`99-child limit reached for parent code: ${parentCode}`);
  }

  return `${parentCode}${String(nextSuffix).padStart(2, '0')}`;
}

/**
 * Generates a terminal reference code for entities like Table or Waiter.
 * @param cafeteriaCode The reference code of the cafeteria.
 * @param type The type of terminal entity (TABLE or WAITER).
 * @returns A new terminal reference code.
 */
export async function generateTerminalReferenceCode(
  cafeteriaCode: string,
  type: ReferenceCodePrefix.TABLE | ReferenceCodePrefix.WAITER
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const prefix = type === ReferenceCodePrefix.TABLE ? ReferenceCodePrefix.TABLE : ReferenceCodePrefix.WAITER;

  // Determine the table to query based on type
  const targetTable = type === ReferenceCodePrefix.TABLE ? cafeterias : marketers; // This needs to be adjusted based on where tables/waiters are stored

  // For now, let's assume a simple increment for terminal codes within a cafeteria
  // This part needs actual schema to implement correctly
  const existingTerminalCodes = await db.select({ code: targetTable.referenceCode }).from(targetTable)
    .where(like(targetTable.referenceCode, `${cafeteriaCode}-${prefix}%`));

  let nextId = 1;
  if (existingTerminalCodes.length > 0) {
    const maxId = existingTerminalCodes.reduce((max: number, current: any) => {
      const idPart = parseInt(current.code.split('-')[2]); // Assuming format P-XXXXXXXX-TXX
      return isNaN(idPart) ? max : Math.max(max, idPart);
    }, 0);
    nextId = maxId + 1;
  }
  return `${cafeteriaCode}-${prefix}${String(nextId).padStart(2, '0')}`;
}


// Helper to determine entity type from a reference code
export function getEntityTypeFromCode(code: string): EntityType | null {
  if (code.startsWith(ReferenceCodePrefix.OWNER)) return EntityType.OWNER;
  if (code.startsWith(ReferenceCodePrefix.MARKETER)) return EntityType.MARKETER;
  if (code.startsWith(ReferenceCodePrefix.CAFETERIA)) return EntityType.CAFETERIA;
  return null;
}

// Helper to extract parent code from a child code
export function getParentCode(childCode: string): string | null {
  const entityType = getEntityTypeFromCode(childCode);
  if (!entityType) return null;

  if (entityType === EntityType.OWNER) return null; // Owners have no parent

  const parts = childCode.split('-');
  if (parts.length < 2) return null; // Not a hierarchical code

  if (entityType === EntityType.MARKETER) {
    // MKT-XXXXXX or MKT-XX
    if (parts[0] === ReferenceCodePrefix.MARKETER && parts[1].length > 2) {
      return parts[0] + '-' + parts[1].substring(0, parts[1].length - 2);
    } else if (parts[0] === ReferenceCodePrefix.MARKETER && parts[1].length === 2) {
      return null; // Top-level marketer
    }
  }

  if (entityType === EntityType.CAFETERIA) {
    // P-XXXXXXXX
    if (parts[0] === ReferenceCodePrefix.CAFETERIA && parts[1].length > 2) {
      return parts[0] + '-' + parts[1].substring(0, parts[1].length - 2);
    } else if (parts[0] === ReferenceCodePrefix.CAFETERIA && parts[1].length === 2) {
      return null; // Top-level cafeteria (should not happen based on rules)
    }
  }

  return null;
}

// Helper to check if a marketer can create a child entity
export function canMarketerCreateChild(marketerCode: string, childType: EntityType.MARKETER | EntityType.CAFETERIA): boolean {
  const entityType = getEntityTypeFromCode(marketerCode);
  if (entityType !== EntityType.MARKETER) return false; // Only marketers can create children here

  // Son marketer can create cafeterias only
  // A 'son' marketer is one whose code has a parent marketer part
  const isSonMarketer = marketerCode.length > (ReferenceCodePrefix.MARKETER.length + 1 + 2); // MKT-XX is not a son, MKT-XXXX is

  if (isSonMarketer) {
    return childType === EntityType.CAFETERIA;
  } else {
    // Grandfather/Father marketer can create marketers and cafeterias
    return true;
  }
}

// Helper to validate a reference code format
export function isValidReferenceCode(code: string): boolean {
  // Owner: OWN-XX
  if (code.match(/^OWN-\d{2}$/)) return true;
  // Marketer: MKT-XX or MKT-XXXX or MKT-XXXXXX etc.
  if (code.match(/^MKT-(\d{2})+$/)) return true;
  // Cafeteria: P-XXXXXXXX (where XXXXXXXX is a marketer code part)
  if (code.match(/^P-(\d{2})+$/)) return true;
  // Table: P-XXXXXXXX-TXX
  if (code.match(/^P-(\d{2})+-T\d{2}$/)) return true;
  // Waiter: P-XXXXXXXX-WXX
  if (code.match(/^P-(\d{2})+-W\d{2}$/)) return true;
  return false;
}
