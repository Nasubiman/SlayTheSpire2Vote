import relicsData from "@/data/relics.json";
import relicImageUrls from "@/data/relic-image-urls.json";
import relicCompactImageUrls from "@/data/relic-compact-image-urls.json";

export type Relic = {
  id: string;
  name: string;
  rarity: string;
  characterId: string;
};

export function getAllRelics(): Relic[] {
  return relicsData.relics as Relic[];
}

export function getRelicImageUrl(relic: Relic): string | null {
  const safeRelicName = relic.name.replace(/[/\\:*?"<>|]/g, "_");
  const key = `relic_${safeRelicName}`;
  return (relicImageUrls as Record<string, string>)[key] ?? null;
}

export function getRelicCompactImageUrl(relic: Relic): string | null {
  const safeRelicName = relic.name.replace(/[/\\:*?"<>|]/g, "_");
  const key = `relic_${safeRelicName}`;
  return (relicCompactImageUrls as Record<string, string>)[key] ?? null;
}
