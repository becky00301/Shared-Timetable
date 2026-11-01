import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: { ko: SITE_URL, en: `${SITE_URL}/en` } }
    },
    {
      url: `${SITE_URL}/en`,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages: { ko: SITE_URL, en: `${SITE_URL}/en` } }
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.2
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2
    }
  ];
}
