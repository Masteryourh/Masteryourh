import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { maintenanceEnabled } from "@/server/site-mode";

export default function robots(): MetadataRoute.Robots {
  if (maintenanceEnabled()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/acces", "/in-constructie", "/confirmare/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
