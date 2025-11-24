import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

const {
  DATABASE_URL,
  DB_POOL_MAX = "10",
  DB_IDLE_TIMEOUT = "10000",
  DB_CONNECT_TIMEOUT = "10",
} = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Please check your .env file.");
}

const client = postgres(DATABASE_URL, {
  prepare: false,
  max: Number(DB_POOL_MAX),
  idle_timeout: Number(DB_IDLE_TIMEOUT),
  connect_timeout: Number(DB_CONNECT_TIMEOUT),
  ssl: 'require', // Use 'require' for Supabase - requires SSL but doesn't verify certificate
});

export const db = drizzle(client, { schema });

// Test database connection on startup
export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
