import { databasePath, openDatabase } from "./database";

const db = openDatabase();
db.$client.close();
console.log(`Drizzle migrations applied to ${databasePath()}`);
