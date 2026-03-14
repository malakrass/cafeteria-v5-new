
import { eq, and, desc, ne } from "drizzle-orm";
import { getDb } from "./db";
import {
  marketers,
  commissionConfigs,
  rechargeRequests,
  commissionDistributions,
  freeOperationPeriods,
  marketerBalances,
  ledgerEntries,
} from "../drizzle/schema";
import {
  calculateCommissionDistributions,
} from "./utils/commissionEngine";
import {
  shouldGenerateCommissions,
} from "./utils/freeOperationEngine";
import { addPrecise, subtractPrecise, roundTo } from "./utils/precision";
import { nanoid } from "nanoid";

// Define a type for the transaction object
type Transaction = any; // Will be properly typed when getDb returns a database instance

export async function getMarketerHierarchy(
  db: Transaction | Awaited<ReturnType<typeof getDb>>,
  cafeteriaMarketerIdOrId: string
): Promise<Array<{ id: string; parentId: string | null; referenceCode: string }>> {
  if (!db) throw new Error("Database not available");

  const hierarchy: Array<{ id: string; parentId: string | null; referenceCode: string }> = [];
  let currentMarketerId: string | null = cafeteriaMarketerIdOrId;

  while (currentMarketerId) {
    const result = await (db as any)
      .select()
      .from(marketers)
      .where(eq(marketers.id, currentMarketerId))
      .limit(1);

    if (result.length === 0) break;

    const marketer = result[0] as any;
    hierarchy.push({
      id: marketer.id,
      parentId: marketer.parentId,
      referenceCode: marketer.referenceCode || "",
    });

    currentMarketerId = marketer.parentId;
  }

  return hierarchy;
}

export async function getCommissionRatesForMarketers(
  db: Transaction | Awaited<ReturnType<typeof getDb>>,
  marketerIds: string[]
): Promise<Map<string, number>> {
  if (!db) throw new Error("Database not available");

  const rates = new Map<string, number>();

  for (const marketerId of marketerIds) {
    const result = await (db as any)
      .select()
      .from(commissionConfigs)
      .where(eq(commissionConfigs.marketerId, marketerId))
      .limit(1);

    if (result.length > 0) {
      rates.set(marketerId, Number(result[0].rate) || 0);
    } else {
      rates.set(marketerId, 0);
    }
  }

  return rates;
}

export async function isCafeteriaInFreePeriod(
  db: Transaction | Awaited<ReturnType<typeof getDb>>,
  cafeteriaId: string
): Promise<boolean> {
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const result = await (db as any)
    .select()
    .from(freeOperationPeriods)
    .where(
      and(
        eq(freeOperationPeriods.cafeteriaId, cafeteriaId),
        // This is a simplified check; in production, use proper date comparison
      )
    );

  return result.some((period: any) => now >= period.startDate && now <= period.endDate);
}

async function releaseCommissionsForPreviousRecharge(tx: Transaction, previousRechargeId: string): Promise<void> {
  const commissionsToRelease = await tx
    .select()
    .from(commissionDistributions)
    .where(
      and(
        eq(commissionDistributions.rechargeRequestId, previousRechargeId),
        eq(commissionDistributions.status, "pending")
      )
    );

  if (commissionsToRelease.length === 0) {
    return; // No pending commissions for the previous recharge to release
  }

  for (const commission of commissionsToRelease) {
    await tx
      .update(commissionDistributions)
      .set({ status: "available" })
      .where(eq(commissionDistributions.id, commission.id));

    // Update marketer balance: move from pending to available
    const marketerId = commission.marketerId;
    const amount = Number(commission.commissionAmount);

    const balance = await (tx as any).select().from(marketerBalances).where(eq(marketerBalances.marketerId, marketerId)).limit(1).then((res: any) => res[0]);

    if (balance) {
      const newPending = subtractPrecise(balance.pendingBalance, amount);
      const newAvailable = addPrecise(balance.availableBalance, amount);

      await tx
        .update(marketerBalances)
        .set({
          pendingBalance: String(Math.max(0, newPending)),
          availableBalance: String(newAvailable),
          lastUpdated: new Date(),
        })
        .where(eq(marketerBalances.marketerId, marketerId));
    } else {
      // This case should ideally not happen if marketerBalances are created when commissions are first generated
      console.warn(`[Commission Release] Marketer balance not found for marketer ${marketerId} during commission release.`);
    }

    // Add ledger entry for commission becoming available
    await tx.insert(ledgerEntries).values({
      id: nanoid(),
      type: "commission_released",
      ledgerType: "commission_available",
      description: `Commission for recharge ${previousRechargeId} released to marketer ${marketerId}`,
      marketerId: marketerId,
      amount: String(amount),
      refId: commission.id,
      createdAt: new Date(),
    });
  }
}

export async function processCommissionsForRecharge(
  tx: Transaction,
  currentRechargeRequestId: string,
  cafeteriaMarketerId: string,
  rechargeAmount: number,
  cafeteriaId: string
): Promise<void> {
  // Find the most recent previously approved recharge for this cafeteria
  const previousRecharges = await (tx as any)
    .select()
    .from(rechargeRequests)
    .where(
      and(
        eq(rechargeRequests.cafeteriaId, cafeteriaId),
        eq(rechargeRequests.status, "approved"),
        // Ensure we only consider recharges that happened before the current one
        ne(rechargeRequests.id, currentRechargeRequestId)
      )
    )
    .orderBy(desc(rechargeRequests.createdAt))
    .limit(1);

  const previousRecharge = previousRecharges[0];

  if (previousRecharge) {
    // Release commissions for the previous recharge
    await releaseCommissionsForPreviousRecharge(tx, previousRecharge.id);
  }

  try {
    const inFreePeriod = await isCafeteriaInFreePeriod(tx, cafeteriaId);
    const shouldGenerate = shouldGenerateCommissions(inFreePeriod);

    if (!shouldGenerate) {
      await (tx as any)
        .update(rechargeRequests)
        .set({ commissionCalculated: true })
        .where(eq(rechargeRequests.id, currentRechargeRequestId));
      return;
    }

    const hierarchy = await getMarketerHierarchy(tx, cafeteriaMarketerId);

    if (hierarchy.length === 0) {
      throw new Error("No marketer hierarchy found for cafeteria");
    }

    const marketerIds = hierarchy.map((m) => m.id);
    const commissionRates = await getCommissionRatesForMarketers(tx, marketerIds);

    const distributions = calculateCommissionDistributions(
      rechargeAmount,
      hierarchy,
      commissionRates
    );

    let totalNewCommissions = 0;
    for (const distribution of distributions) {
      await (tx as any).insert(commissionDistributions).values({        id: nanoid(),
        rechargeRequestId: currentRechargeRequestId,
        marketerId: distribution.marketerId,
        level: distribution.level,
        commissionAmount: String(roundTo(distribution.commissionAmount)),
        status: "pending",
        createdAt: new Date(),
      });

      const balance = await (tx as any).select().from(marketerBalances).where(eq(marketerBalances.marketerId, distribution.marketerId)).limit(1).then((res: any) => res[0]);
      const newPending = addPrecise(balance?.pendingBalance ?? '0', distribution.commissionAmount);

      if(balance){
        await (tx as any)
            .update(marketerBalances)
            .set({
                pendingBalance: String(Math.max(0, newPending)),
                lastUpdated: new Date(),
            })
            .where(eq(marketerBalances.marketerId, distribution.marketerId));
      } else {
        await (tx as any).insert(marketerBalances).values({
            id: nanoid(),
            marketerId: distribution.marketerId,
            pendingBalance: String(Math.max(0, newPending)),
            availableBalance: '0',
            totalWithdrawn: '0',
        });
      }

      totalNewCommissions = addPrecise(totalNewCommissions, distribution.commissionAmount);
    }

    await (tx as any)
      .update(rechargeRequests)
      .set({ commissionCalculated: true })
      .where(eq(rechargeRequests.id, currentRechargeRequestId));

    console.log(
      `[Commission Processing] Recharge ${currentRechargeRequestId}: Processed ${distributions.length} commission distributions, total: $${totalNewCommissions}`
    );
  } catch (error) {
    console.error(
      `[Commission Processing] Error processing commissions for recharge ${currentRechargeRequestId}:`,
      error
    );
    throw error;
  }
}
