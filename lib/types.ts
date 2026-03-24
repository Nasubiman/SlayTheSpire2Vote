export type Rating = "a" | "b" | "c" | "d" | "e";

export type Card = {
  id: string;
  name: string;
  cost: string;
  rarity: string;
  type: string;
  characterId: string;
  characterName: string;
};

export type Poll = {
  id: string;
  title: string;
  characterId: string;
  characterName: string;
  createdAt: number;
};

export type CardResult = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
};

export const RATINGS: { value: Rating; label: string; color: string }[] = [
  { value: "a", label: "S", color: "bg-yellow-400 text-black" },
  { value: "b", label: "A", color: "bg-red-500 text-white" },
  { value: "c", label: "B", color: "bg-green-500 text-white" },
  { value: "d", label: "C", color: "bg-blue-500 text-white" },
  { value: "e", label: "D", color: "bg-gray-500 text-white" },
];

export const CHARACTERS = [
  { id: "ironclad",  name: "アイアンクラッド" },
  { id: "silent",    name: "サイレント" },
  { id: "defect",    name: "ディフェクト" },
  { id: "necro",     name: "ネクロバインダー" },
  { id: "regent",    name: "リージェント" },
  { id: "colorless", name: "無色カード" },
];
