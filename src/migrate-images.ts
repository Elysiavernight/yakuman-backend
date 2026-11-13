import { openDatabase } from "./database";
import { migrateImages } from "./storage/migrate-images";

const db = openDatabase();
try {
  await migrateImages(db, process.argv.includes("--apply"));
} finally {
  db.$client.close();
}
