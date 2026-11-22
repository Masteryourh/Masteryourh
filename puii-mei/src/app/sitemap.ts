import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [farms, lots] = await Promise.all([farmRepository.list(), lotRepository.list()]);
  const staticRoutes = ["", "/precomanda", "/cum-functioneaza", "/gospodarii", "/trasabilitate", "/despre-noi", "/contact", "/devino-partener", "/in-curand", "/confidentialitate", "/legislatie", "/cifre"];
  return [
    ...staticRoutes.map((r) => ({
      url: `${site.url}${r}`,
      changeFrequency: "weekly" as const,
      priority: r === "" ? 1 : r === "/precomanda" ? 0.9 : 0.7,
    })),
    ...farms.map((f) => ({ url: `${site.url}/gospodarii/${f.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...lots.map((l) => ({ url: `${site.url}/trasabilitate/${l.code}`, changeFrequency: "daily" as const, priority: 0.4 })),
  ];
}
