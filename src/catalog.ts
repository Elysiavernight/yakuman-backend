interface Yakuman {
  id: string;
  name: string;
  english: string;
  japanese: string;
  multiplier: number;
  tiles: string;
}

// The API owns the supported types and tile validation. Example hands are
// used only by the optional seed script, never imported by the frontend.
export const yakumans: Yakuman[] = [
  {
    id: "kokushi",
    name: "Kokushi musou",
    english: "ThirMeen orphans",
    japanese: "国士無双",
    multiplier: 1,
    tiles: "1m 9m 1p 9p 1s 9s 1z 2z 3z 4z 5z 6z 7z 1m",
  },
  {
    id: "kokushi-13",
    name: "Kokushi Juusanmen Machi",
    english: "Thirteen orphans, thirteen-sided wait",
    japanese: "国士無双十三面待ち",
    multiplier: 2,
    tiles: "1m 9m 1p 9p 1s 9s 1z 2z 3z 4z 5z 6z 7z 1m",
  },
  {
    id: "suuankou",
    name: "Suuankou",
    english: "Four concealed triplets",
    japanese: "四暗刻",
    multiplier: 1,
    tiles: "2m 2m 2m 4p 4p 4p 6s 6s 6s 7z 7z 7z 5z 5z",
  },
  {
    id: "suuankou-tanki",
    name: "Suuankou Tanki",
    english: "Four concealed triplets, single wait",
    japanese: "四暗刻単騎",
    multiplier: 2,
    tiles: "2m 2m 2m 4p 4p 4p 6s 6s 6s 7z 7z 7z 5z 5z",
  },
  {
    id: "daisangen",
    name: "Daisangen",
    english: "Big three dragons",
    japanese: "大三元",
    multiplier: 1,
    tiles: "5z 5z 5z 6z 6z 6z 7z 7z 7z 2m 3m 4m 8p 8p",
  },
  {
    id: "shousuushii",
    name: "Shousuushii",
    english: "Little four winds",
    japanese: "小四喜",
    multiplier: 1,
    tiles: "1z 1z 1z 2z 2z 2z 3z 3z 3z 4z 4z 2s 3s 4s",
  },
  {
    id: "daisuushii",
    name: "Daisuushii",
    english: "Big four winds",
    japanese: "大四喜",
    multiplier: 2,
    tiles: "1z 1z 1z 2z 2z 2z 3z 3z 3z 4z 4z 4z 5p 5p",
  },
  {
    id: "tsuuiisou",
    name: "Tsuuiisou",
    english: "All honors",
    japanese: "字一色",
    multiplier: 1,
    tiles: "1z 1z 1z 2z 2z 2z 5z 5z 5z 6z 6z 6z 7z 7z",
  },
  {
    id: "chinroutou",
    name: "Chinroutou",
    english: "All terminals",
    japanese: "清老頭",
    multiplier: 1,
    tiles: "1m 1m 1m 9m 9m 9m 1p 1p 1p 9s 9s 9s 1s 1s",
  },
  {
    id: "ryuuiisou",
    name: "Ryuuiisou",
    english: "All green",
    japanese: "緑一色",
    multiplier: 1,
    tiles: "2s 3s 4s 2s 3s 4s 6s 6s 6s 8s 8s 8s 6z 6z",
  },
  {
    id: "chuuren",
    name: "Chuuren Poutou",
    english: "Nine gates",
    japanese: "九蓮宝燈",
    multiplier: 1,
    tiles: "1m 1m 1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5m",
  },
  {
    id: "junsei-chuuren",
    name: "Chuuren Poutou Kyumen Machi",
    english: "Pure nine gates",
    japanese: "純正九蓮宝燈",
    multiplier: 2,
    tiles: "1m 1m 1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5m",
  },
  {
    id: "suukantsu",
    name: "Suukantsu",
    english: "Four quads",
    japanese: "四槓子",
    multiplier: 1,
    tiles: "1m 1m 1m 1m 2p 2p 2p 2p 3s 3s 3s 3s 7z 7z 7z 7z 5z 5z",
  },
  {
    id: "tenhou",
    name: "Tenhou",
    english: "Blessing of heaven",
    japanese: "天和",
    multiplier: 1,
    tiles: "1m 2m 3m 4p 5p 6p 7s 8s 9s 7z 7z 7z 5z 5z",
  },
  {
    id: "chiihou",
    name: "Chiihou",
    english: "Blessing of earth",
    japanese: "地和",
    multiplier: 1,
    tiles: "1m 2m 3m 4p 5p 6p 7s 8s 9s 7z 7z 7z 5z 5z",
  },
];

export const tileIds = [
  ...["m", "p", "s"].flatMap((suit) =>
    Array.from({ length: 9 }, (_, i) => `${i + 1}${suit}`),
  ),
  ...Array.from({ length: 7 }, (_, i) => `${i + 1}z`),
];

export function getYakuman(id: string): Yakuman {
  const yakuman = yakumans.find((y) => y.id === id);
  if (!yakuman) throw new Error(`Unknown yakuman type: ${id}`);
  return yakuman;
}
