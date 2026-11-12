import { db } from "./db";
import { getYakuman } from "./catalog";
import { records, users } from "./schema";

// Opt-in sample memories, clearly labeled in the interface. No shared demo password.
if (db.select({ id: users.id }).from(users).limit(1).get()) {
  console.log("The database already has players. Sample data was not added.");
  process.exit(0);
}
const players = [
  {
    id: "sample-aoi",
    username: "aoi",
    name: "Aoi",
    bio: "Chasing rare hands, collecting good memories. Usually in the Gold Room.",
  },
  {
    id: "sample-ren",
    username: "ren",
    name: "Ren",
    bio: "One more hanchan. It’s always one more hanchan.",
  },
  {
    id: "sample-yuki",
    username: "yuki",
    name: "Yuki",
    bio: "Here for the friends. Staying for the yakuman.",
  },
];
const password = await Bun.password.hash(crypto.randomUUID());
const ago = (hours: number) =>
  new Date(Date.now() - hours * 3600000).toISOString();
db.transaction((tx) => {
  for (const p of players)
    tx.insert(users)
      .values({
        ...p,
        password,
        createdAt: ago(120 * 24),
        demo: true,
      })
      .run();
  const memories = [
    {
      user: "sample-aoi",
      type: "kokushi-13",
      platform: "Mahjong Soul",
      hours: 2,
      text: "Kept all thirteen orphans and hoped for the best. The very next draw was the 1-man. Still can’t quite believe it. ✨",
    },
    {
      user: "sample-ren",
      type: "daisangen",
      platform: "Tenhou",
      hours: 19,
      text: "Three dragons and a very patient wait. First Daisangen of the journey — definitely one for the scrapbook.",
    },
    {
      user: "sample-yuki",
      type: "suuankou",
      platform: "In person",
      hours: 47,
      text: "Friday night, last hanchan, and the whole table went quiet. Then everyone started cheering. This is why we play.",
    },
    {
      user: "sample-aoi",
      type: "tsuuiisou",
      platform: "Mahjong Soul",
      hours: 110,
      text: "A hand full of honors. A night full of good company.",
    },
    {
      user: "sample-aoi",
      type: "daisangen",
      platform: "Mahjong Soul",
      hours: 210,
      text: "My first big three dragons. The beginning of a very lucky collection.",
    },
    {
      user: "sample-ren",
      type: "kokushi",
      platform: "Tenhou",
      hours: 310,
      text: "Thirteen orphans, one very happy player.",
    },
  ];
  for (const m of memories)
    tx.insert(records)
      .values({
        id: crypto.randomUUID(),
        userId: m.user,
        types: [m.type],
        hand: getYakuman(m.type).tiles.split(" ").filter(Boolean),
        description: m.text,
        platform: m.platform,
        createdAt: ago(m.hours),
      })
      .run();
});
console.log(
  "Added 3 sample players and 6 sample memories. Create your own account to start posting.",
);
