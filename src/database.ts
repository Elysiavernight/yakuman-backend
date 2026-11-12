import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

export const databasePath = () =>
  process.env.DATABASE_PATH ??
  resolve(import.meta.dir, "../data/yakuman.sqlite");

export function openDatabase(path = databasePath()) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const client = new Database(path, { create: true });
  try {
    client.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    const db = drizzle(client, { schema });
    migrate(db, { migrationsFolder: resolve(import.meta.dir, "../drizzle") });
    return db;
  } catch (error) {
    client.close();
    throw error;
  }
}
