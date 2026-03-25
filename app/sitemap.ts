import { MetadataRoute } from "next";
import { CHARACTERS } from "@/lib/types";

const BASE_URL = "https://slaythespire2vote.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const characterUrls = CHARACTERS.map((c) => ({
    url: `${BASE_URL}/polls/${c.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const resultUrls = CHARACTERS.map((c) => ({
    url: `${BASE_URL}/polls/${c.id}/results`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...characterUrls,
    ...resultUrls,
  ];
}
