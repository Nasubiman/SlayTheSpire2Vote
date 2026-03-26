import { MetadataRoute } from "next";
import { CHARACTERS } from "@/lib/types";

const BASE_URL = "https://slaythespire2vote.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const characterUrls = CHARACTERS.map((c) => ({
    url: `${BASE_URL}/polls/${c.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const tierListUrls = [
    { url: `${BASE_URL}/tier-list`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/tier-list/relics`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE_URL}/tier-list/enemies`, changeFrequency: "daily" as const, priority: 0.9 },
    ...CHARACTERS.map((c) => ({
      url: `${BASE_URL}/tier-list?char=${c.id}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];

  return [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/relics`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/enemies`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...characterUrls,
    ...tierListUrls,
  ];
}
