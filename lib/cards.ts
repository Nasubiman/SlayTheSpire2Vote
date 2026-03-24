import cardsData from "@/data/cards.json";
import type { Card } from "./types";

export function getCardsByCharacter(characterId: string): Card[] {
  return (cardsData.cards as Card[]).filter(
    (c) => c.characterId === characterId
  );
}

export function getAllCards(): Card[] {
  return cardsData.cards as Card[];
}
