import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://calxmap.in";

  const routes = [
    { path: "/", priority: 1.0 },
    { path: "/auth/signup", priority: 0.9 },
  ];

  const lastModified = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}

