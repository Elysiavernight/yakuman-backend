import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import { openDatabase } from "./database";
import { records, users } from "./schema";
import type { Post, User } from "./models";

export const db = openDatabase();
export type UserRow = typeof users.$inferSelect;

export const publicUser = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  name: row.name,
  bio: row.bio ?? "",
  pronouns: row.pronouns ?? "",
  avatar: row.avatar,
  createdAt: row.createdAt,
  demo: row.demo,
});

export function posts(): Post[] {
  return db
    .select({ post: getTableColumns(records), user: getTableColumns(users) })
    .from(records)
    .innerJoin(users, eq(records.userId, users.id))
    .orderBy(desc(records.createdAt), desc(sql`${records}.rowid`))
    .all()
    .map(({ post, user }) => ({ ...post, user: publicUser(user) }));
}
