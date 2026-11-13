import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import { openDatabase } from "./database";
import { records, users } from "./schema";
import type { Post, User } from "./models";
import { imageThumbnail, imageUrl } from "./images";

export const db = openDatabase();
export type UserRow = typeof users.$inferSelect;
// Keep legacy base64 blobs inside SQLite, not in every joined post row.
export const userColumns = {
  ...getTableColumns(users),
  avatar: sql<string>`case when ${users.avatar} like 'data:%' then 'legacy:' || length(${users.avatar}) else ${users.avatar} end`,
};
const postColumns = {
  ...getTableColumns(records),
  image: sql<string>`case when ${records.image} like 'data:%' then 'legacy:' || length(${records.image}) else ${records.image} end`,
};

export const publicUser = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  name: row.name,
  bio: row.bio ?? "",
  pronouns: row.pronouns ?? "",
  avatar: imageUrl(row.avatar, "avatars", row.id),
  createdAt: row.createdAt,
  demo: row.demo,
});

export function posts(id?: string): Post[] {
  return db
    .select({ post: postColumns, user: userColumns })
    .from(records)
    .innerJoin(users, eq(records.userId, users.id))
    .where(id ? eq(records.id, id) : undefined)
    .orderBy(desc(records.createdAt), desc(sql`${records}.rowid`))
    .all()
    .map(({ post, user }) => ({
      ...post,
      image: imageUrl(post.image, "screenshots", post.id),
      imageThumbnail: imageThumbnail(post.image, post.id),
      user: publicUser(user),
    }));
}
