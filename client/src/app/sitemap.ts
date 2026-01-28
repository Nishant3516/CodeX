import { MetadataRoute } from "next";

const BASE_URL = 'https://devsarena.in';

type StaticRoute = {
  path: string;
  priority: number;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
};

const STATIC_ROUTES: StaticRoute[] = [
  { path: "", priority: 1, changefreq: "daily" }, 
  { path: "/playground", priority: 0.9, changefreq: "weekly" },
  { path: "/projects", priority: 0.9, changefreq: "weekly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date(); 

  return STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    priority: route.priority,
    changeFrequency: route.changefreq
  }));
}