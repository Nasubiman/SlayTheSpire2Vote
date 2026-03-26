import enemiesData from "@/data/enemies.json";
import enemyImageUrls from "@/data/enemy-image-urls.json";

export type Enemy = {
  id: string;
  name: string;
  imageKey: string;
  area: string;
  type: string;
};

export function getAllEnemies(): Enemy[] {
  return enemiesData.enemies as Enemy[];
}

export function getEnemyImageUrl(enemy: Enemy): string | null {
  return (enemyImageUrls as Record<string, string>)[enemy.imageKey] ?? null;
}
