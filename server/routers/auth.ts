/**
 * Authentication Router - Local Username/Password Authentication
 * Handles login, logout, password change, and user creation
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure, marketerProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users, marketers, cafeterias, cafeteriaStaff } from "../../drizzle/schema";
import bcryptjs from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";

const SALT_ROUNDS = 10;

/**
 * Hash password using bcryptjs
 */
async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Generate a unique username
 */
async function generateUniqueUsername(baseName: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let username = baseName.toLowerCase().replace(/\s+/g, "_");
  let counter = 1;
  
  while (true) {
    const existing = await db.select().from(users).where(eq(users.loginUsername, username));
    if (existing.length === 0) {
      break;
    }
    username = `${baseName.toLowerCase().replace(/\s+/g, "_")}_${counter}`;
    counter++;
  }
  
  return username;
}

export const authRouter = router({
  /**
   * Login with username and password
   */
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Search in users table
      let user = (await db.select().from(users).where(eq(users.loginUsername, input.username)))[0];
      let userType = "user";

      // If not found in users, search in marketers
      if (!user) {
        const marketer = (await db.select().from(marketers).where(eq(marketers.loginUsername, input.username)))[0];
        if (marketer && marketer.passwordHash) {
          const isValid = await verifyPassword(input.password, marketer.passwordHash);
          if (!isValid) {
            throw new Error("Invalid username or password");
          }

          // Create session for marketer
          const openId = `marketer_${marketer.id}`;
          const sessionToken = await sdk.createSessionToken(openId, {
            name: marketer.name,
            expiresInMs: ONE_YEAR_MS,
          });

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

          return {
            success: true,
            message: "Login successful",
            userType: "marketer",
            name: marketer.name,
          };
        }
      }

      // If not found in marketers, search in cafeterias
      if (!user) {
        const cafeteria = (await db.select().from(cafeterias).where(eq(cafeterias.loginUsername, input.username)))[0];
        if (cafeteria && cafeteria.passwordHash) {
          const isValid = await verifyPassword(input.password, cafeteria.passwordHash);
          if (!isValid) {
            throw new Error("Invalid username or password");
          }

          // Create session for cafeteria
          const openId = `cafeteria_${cafeteria.id}`;
          const sessionToken = await sdk.createSessionToken(openId, {
            name: cafeteria.name,
            expiresInMs: ONE_YEAR_MS,
          });

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

          return {
            success: true,
            message: "Login successful",
            userType: "cafeteria",
            name: cafeteria.name,
          };
        }
      }

      // If not found in cafeterias, search in cafeteriaStaff
      if (!user) {
        const staff = (await db.select().from(cafeteriaStaff).where(eq(cafeteriaStaff.loginUsername, input.username)))[0];
        if (staff && staff.passwordHash) {
          const isValid = await verifyPassword(input.password, staff.passwordHash);
          if (!isValid) {
            throw new Error("Invalid username or password");
          }

          // Create session for staff
          const openId = `staff_${staff.id}`;
          const sessionToken = await sdk.createSessionToken(openId, {
            name: staff.name,
            expiresInMs: ONE_YEAR_MS,
          });

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

          return {
            success: true,
            message: "Login successful",
            userType: "staff",
            name: staff.name,
          };
        }
      }

      // If found in users table
      if (user && user.passwordHash) {
        const isValid = await verifyPassword(input.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid username or password");
        }

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          success: true,
          message: "Login successful",
          userType: "user",
          name: user.name,
        };
      }

      throw new Error("Invalid username or password");
    }),

  /**
   * Change password for logged-in user
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().min(1, "Old password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!ctx.user) throw new Error("User not authenticated");

      // Get user from database
      const user = (await db.select().from(users).where(eq(users.id, ctx.user.id)))[0];
      if (!user || !user.passwordHash) {
        throw new Error("User not found or password not set");
      }

      // Verify old password
      const isValid = await verifyPassword(input.oldPassword, user.passwordHash);
      if (!isValid) {
        throw new Error("Old password is incorrect");
      }

      // Hash new password
      const newPasswordHash = await hashPassword(input.newPassword);

      // Update password
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "Password changed successfully",
      };
    }),

  /**
   * Create user credentials (for owner/admin to create marketer/cafeteria/staff accounts)
   */
  createUserCredentials: adminProcedure
    .input(
      z.object({
        entityId: z.string(),
        entityType: z.enum(["marketer", "cafeteria", "staff"]),
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const passwordHash = await hashPassword(input.password);

      if (input.entityType === "marketer") {
        const marketer = (await db.select().from(marketers).where(eq(marketers.id, input.entityId)))[0];
        if (!marketer) throw new Error("Marketer not found");

        // Check if username already exists
        const existing = await db.select().from(marketers).where(eq(marketers.loginUsername, input.username));
        if (existing.length > 0) throw new Error("Username already exists");

        await db.update(marketers).set({ loginUsername: input.username, passwordHash }).where(eq(marketers.id, input.entityId));

        return {
          success: true,
          message: "Marketer credentials created",
          username: input.username,
          entityType: "marketer",
        };
      } else if (input.entityType === "cafeteria") {
        const cafeteria = (await db.select().from(cafeterias).where(eq(cafeterias.id, input.entityId)))[0];
        if (!cafeteria) throw new Error("Cafeteria not found");

        // Check if username already exists
        const existing = await db.select().from(cafeterias).where(eq(cafeterias.loginUsername, input.username));
        if (existing.length > 0) throw new Error("Username already exists");

        await db.update(cafeterias).set({ loginUsername: input.username, passwordHash }).where(eq(cafeterias.id, input.entityId));

        return {
          success: true,
          message: "Cafeteria credentials created",
          username: input.username,
          entityType: "cafeteria",
        };
      } else if (input.entityType === "staff") {
        const staff = (await db.select().from(cafeteriaStaff).where(eq(cafeteriaStaff.id, input.entityId)))[0];
        if (!staff) throw new Error("Staff not found");

        // Check if username already exists
        const existing = await db.select().from(cafeteriaStaff).where(eq(cafeteriaStaff.loginUsername, input.username));
        if (existing.length > 0) throw new Error("Username already exists");

        await db.update(cafeteriaStaff).set({ loginUsername: input.username, passwordHash }).where(eq(cafeteriaStaff.id, input.entityId));

        return {
          success: true,
          message: "Staff credentials created",
          username: input.username,
          entityType: "staff",
        };
      }

      throw new Error("Invalid entity type");
    }),

  /**
   * Get current user info (from OAuth session)
   */
  me: publicProcedure.query(opts => opts.ctx.user),

  /**
   * Logout
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
});
