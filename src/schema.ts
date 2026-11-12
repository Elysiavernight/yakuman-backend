import { desc, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  bio: text("bio").default(""),
  pronouns: text("pronouns").default(""),
  avatar: text("avatar").notNull().default(""),
  createdAt: text("createdAt").notNull(),
  demo: integer("demo", { mode: "boolean" }).notNull().default(false),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires").notNull(),
});

export const records = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    types: text("types", { mode: "json" }).$type<string[]>().notNull(),
    hand: text("hand", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    description: text("description").notNull().default(""),
    gameLink: text("gameLink").notNull().default(""),
    image: text("image").notNull().default(""),
    platform: text("platform").notNull().default("Other"),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: text("createdAt").notNull(),
  },
  (table) => [
    index("posts_date").on(desc(table.createdAt)),
    index("posts_user").on(table.userId),
  ],
);
