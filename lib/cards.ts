import cardsData from "@/data/cards.json";
import imageUrls from "@/data/image-urls.json";
import type { Card } from "./types";

export function getCardsByCharacter(characterId: string): Card[] {
  return (cardsData.cards as Card[]).filter(
    (c) => c.characterId === characterId
  );
}

export function getAllCards(): Card[] {
  return cardsData.cards as Card[];
}

export function getCardImageUrl(card: Card): string | null {
  const safeCardName = card.name.replace(/[/\\:*?"<>|]/g, "_");
  const key = `${card.characterId}_${safeCardName}`;
  return (imageUrls as Record<string, string>)[key] ?? null;
}
