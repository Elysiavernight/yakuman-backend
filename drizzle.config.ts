import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? resolve("data/yakuman.sqlite"),
  },
});
