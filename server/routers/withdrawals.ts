
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  withdrawalRequests,
  marketerBalances,
  ledgerEntries,
} from "../../drizzle/schema";
import { addPrecise, subtractPrecise } from "../utils/precision";

import { createWithdrawalRequest } from "../db";

export const withdrawalsRouter = router({
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        marketerId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const marketerId = input.marketerId || (ctx.user as any)?.marketerId || ctx.user?.id;
      if (!marketerId) {
        throw new Error("Marketer ID is required");
      }
      const withdrawal = await createWithdrawalRequest(marketerId, input.amount);
      return withdrawal;
    }),
  /**
   * Approve a withdrawal request
   */
  approveRequest: protectedProcedure
    .input(
      z.object({
        withdrawalRequestId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db.transaction(async (tx) => {
        const requests = await tx
          .select()
          .from(withdrawalRequests)
          .where(eq(withdrawalRequests.id, input.withdrawalRequestId));

        if (requests.length === 0) {
          throw new Error("Withdrawal request not found");
        }

        const request = requests[0];

        if (request.status !== "pending") {
          throw new Error(`Withdrawal request has already been processed (status: ${request.status})`);
        }

        const amount = Number(request.amount) || 0;

        const balance = await tx.select().from(marketerBalances).where(eq(marketerBalances.marketerId, request.marketerId)).then(res => res[0]);

        if (!balance || Number(balance.availableBalance) < amount) {
          await tx.update(withdrawalRequests).set({ status: "rejected", notes: "Insufficient balance at time of approval" }).where(eq(withdrawalRequests.id, input.withdrawalRequestId));
          throw new Error("Insufficient available balance");
        }

        const now = new Date();
        await tx
          .update(withdrawalRequests)
          .set({
            status: "approved",
            processedAt: now,
            processedBy: ctx.user?.name || "admin",
            notes: input.notes,
          })
          .where(eq(withdrawalRequests.id, input.withdrawalRequestId));

        const newAvailable = subtractPrecise(balance.availableBalance ?? '0', amount);
        const newTotalWithdrawn = addPrecise(balance.totalWithdrawn ?? '0', amount);

        await tx
          .update(marketerBalances)
          .set({
            availableBalance: String(Math.max(0, newAvailable)),
            totalWithdrawn: String(newTotalWithdrawn),
            lastUpdated: now,
          })
          .where(eq(marketerBalances.marketerId, request.marketerId));

        await tx.insert(ledgerEntries).values({
          id: nanoid(),
          type: "withdrawal_approved",
          ledgerType: "commission_withdrawn",
          description: `Withdrawal approved: ${amount}`,
          cafeteriaId: "", // Withdrawals are not cafeteria-specific
          amount: String(amount),
          refId: input.withdrawalRequestId,
          createdAt: now,
        });

        return {
          success: true,
          withdrawalRequestId: input.withdrawalRequestId,
        };
      });
    }),

  /**
   * Reject a withdrawal request
   */
  rejectRequest: protectedProcedure
    .input(
      z.object({
        withdrawalRequestId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(withdrawalRequests)
        .set({
          status: "rejected",
          processedAt: new Date(),
          processedBy: ctx.user?.name || "admin",
          notes: input.reason,
        })
        .where(eq(withdrawalRequests.id, input.withdrawalRequestId));

      return {
        success: true,
        withdrawalRequestId: input.withdrawalRequestId,
      };
    }),

  getRequests: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(withdrawalRequests)
        .where(input.status ? eq(withdrawalRequests.status, input.status) : undefined);

      return result.map((r) => ({
        id: r.id,
        marketerId: r.marketerId,
        amount: Number(r.amount) || 0,
        status: r.status,
        createdAt: r.requestedAt,
      }));
    }),
});
