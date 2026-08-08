import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://cancelagencyculture.in/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://cancelagencyculture.in/sample-report/",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://cancelagencyculture.in/details/",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://cancelagencyculture.in/legal/",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
