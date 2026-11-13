import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { and, eq, like } from "drizzle-orm";
import { databasePath, type openDatabase } from "../database";
import { records, users } from "../schema";
import { r2Client, storeImage, type ImageStore } from "../images";

// Dry-run by default. --apply backs up SQLite before changing any references.
export async function migrateImages(
  db: ReturnType<typeof openDatabase>,
  apply = false,
  storage?: ImageStore,
) {
  const avatars = db
    .select({ id: users.id })
    .from(users)
    .where(like(users.avatar, "data:%"))
    .all();
  const screenshots = db
    .select({ id: records.id })
    .from(records)
    .where(like(records.image, "data:%"))
    .all();
  console.log(
    `${avatars.length} avatars and ${screenshots.length} screenshots need migration.`,
  );
  if (apply && avatars.length + screenshots.length > 0) {
    const client = storage ?? r2Client();
    const directory = join(dirname(databasePath()), "backups");
    mkdirSync(directory, { recursive: true });
    const backup = join(directory, `before-r2-${Date.now()}.sqlite`);
    db.$client.query("VACUUM INTO ?").run(backup);
    console.log(`Database backup: ${backup}`);
    for (const { id } of avatars) {
      const original = db
        .select({ value: users.avatar })
        .from(users)
        .where(eq(users.id, id))
        .get()?.value;
      if (!original?.startsWith("data:")) continue;
      const key = await storeImage(original, "avatars", client);
      const result = db
        .update(users)
        .set({ avatar: key })
        .where(and(eq(users.id, id), eq(users.avatar, original)))
        .returning({ id: users.id })
        .get();
      console.log(
        `Avatar ${id}: ${result ? "migrated" : "changed concurrently; skipped"}`,
      );
    }
    for (const { id } of screenshots) {
      const original = db
        .select({ value: records.image })
        .from(records)
        .where(eq(records.id, id))
        .get()?.value;
      if (!original?.startsWith("data:")) continue;
      const key = await storeImage(original, "screenshots", client);
      const result = db
        .update(records)
        .set({ image: key })
        .where(and(eq(records.id, id), eq(records.image, original)))
        .returning({ id: records.id })
        .get();
      console.log(
        `Screenshot ${id}: ${result ? "migrated" : "changed concurrently; skipped"}`,
      );
    }
  } else if (!apply) {
    console.log(
      "Dry run. Run bun run images:migrate --apply to upload and replace embedded images.",
    );
  }
}
