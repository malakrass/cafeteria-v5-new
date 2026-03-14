import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getMarketerBalance, getCommissionDistributions, transitionCommissionsToAvailable } from "../db";
import { calculateTotalCommission, getCommissionHistorySummary, getCommissionStatusSummary } from "../utils/commissionEngine";
import { eq, and, desc } from "drizzle-orm";
import { marketers, commissionDistributions } from "../../drizzle/schema";
import { getDb } from "../db";

// Helper to check if a user has access to a marketer's data
async function checkMarketerAccess(db: any, userId: string, marketerId: string) {
    const marketerRecord = await db
        .select()
        .from(marketers)
        .where(eq(marketers.id, marketerId))
        .limit(1);

    if (marketerRecord.length === 0) {
        return false; // Marketer does not exist
    }

    // This is a simplified check. In a real system, you would have a more complex
    // mapping between users and marketers (e.g., a user might be a marketer themselves,
    // or an admin with rights to view specific marketers).
    // For this fix, we assume a user can only access their own marketer data.
    // A more robust implementation would check against ctx.user properties.
    return marketerRecord[0].id === userId; 
}

export const commissionsRouter = router({
  getBalance: protectedProcedure
    .input(z.object({ marketerId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== 'admin' && !(await checkMarketerAccess(db, ctx.user.id, input.marketerId))) {
        throw new Error("Unauthorized access to marketer balance");
      }

      const balance = await getMarketerBalance(input.marketerId);

      if (!balance) {
        return {
          pendingBalance: 0,
          availableBalance: 0,
          totalWithdrawn: 0,
          totalEarned: 0,
          canWithdraw: false,
        };
      }

      const pending = Number(balance.pendingBalance) || 0;
      const available = Number(balance.availableBalance) || 0;
      const withdrawn = Number(balance.totalWithdrawn) || 0;

      return getCommissionStatusSummary(pending, available, withdrawn);
    }),

  getDistributions: protectedProcedure
    .input(z.object({ rechargeRequestId: z.string() }))
    .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const distributions = await getCommissionDistributions(input.rechargeRequestId);

        if (distributions.length > 0) {
            const marketerId = distributions[0].marketerId;
            if (ctx.user.role !== 'admin' && !(await checkMarketerAccess(db, ctx.user.id, marketerId))) {
                throw new Error("Unauthorized access to commission distributions");
            }
        }

        return {
            total: distributions.length,
            distributions: distributions.map((d) => ({
                id: d.id,
                marketerId: d.marketerId,
                level: d.level,
                commissionAmount: Number(d.commissionAmount) || 0,
                status: d.status,
                createdAt: d.createdAt,
            })),
            totalAmount: calculateTotalCommission(
                distributions.map((d) => ({ commissionAmount: Number(d.commissionAmount) || 0 }))
            ),
        };
    }),

  getCommissionHistory: protectedProcedure
    .input(z.object({ marketerId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== 'admin' && !(await checkMarketerAccess(db, ctx.user.id, input.marketerId))) {
        throw new Error("Unauthorized access to commission history");
      }

      const history = await (db.query as any).commissionDistributions.findMany({
        where: eq(commissionDistributions.marketerId, input.marketerId),
        orderBy: desc(commissionDistributions.createdAt),
        with: {
          rechargeRequest: {
            with: {
              cafeteria: true,
            },
          },
        },
      });

      return (history as any[]).map((h) => ({
        id: h.id,
        marketerId: h.marketerId,
        level: h.level,
        commissionAmount: Number(h.commissionAmount) || 0,
        status: h.status,
        createdAt: h.createdAt,
        cafeteriaName: h.rechargeRequest?.cafeteria?.name || 'N/A',
      }));
    }),

  transitionToAvailable: protectedProcedure
    .input(z.object({ marketerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (ctx.user.role !== 'admin' && !(await checkMarketerAccess(db, ctx.user.id, input.marketerId))) {
            throw new Error("Unauthorized to transition commissions for this marketer");
        }

        await transitionCommissionsToAvailable(input.marketerId);
        const balance = await getMarketerBalance(input.marketerId);

        return {
            success: true,
            newBalance: {
                pendingBalance: Number(balance?.pendingBalance) || 0,
                availableBalance: Number(balance?.availableBalance) || 0,
            },
        };
    }),
});
