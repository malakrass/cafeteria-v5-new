/**
 * Database Seed Script
 * Creates initial owner user with login credentials
 */
import "dotenv/config";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import bcryptjs from "bcryptjs";
import { nanoid } from "nanoid";

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  try {
    console.log("🌱 Starting database seed...");

    // Create owner user with login credentials
    const ownerUsername = "yaserras@gmail.com";
    const ownerPassword = "Kamel123321$";
    const ownerPasswordHash = await hashPassword(ownerPassword);

    const ownerId = nanoid();
    const ownerOpenId = `owner_${ownerId}`;

    await db.insert(users).values({
      id: ownerId,
      openId: ownerOpenId,
      name: "System Owner",
      email: "yaserras@gmail.com",
      loginUsername: ownerUsername,
      passwordHash: ownerPasswordHash,
      loginMethod: "email",
      role: "admin",
      preferredLanguage: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    console.log("✅ Owner user created successfully!");
    console.log("📝 Login Credentials:");
    console.log(`   Username: ${ownerUsername}`);
    console.log(`   Password: ${ownerPassword}`);
    console.log("⚠️  Please change this password immediately after first login!");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
