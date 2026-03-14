import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { cafeterias } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const cafeteriasRouter = router({
  getCafeteriaDetails: protectedProcedure
    .input(z.object({ cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const cafeteria = await (db.query as any).cafeterias.findFirst({
        where: eq(cafeterias.id, input.cafeteriaId),
      });

      if (!cafeteria) {
        throw new Error("Cafeteria not found");
      }
      return cafeteria;
    }),
});
