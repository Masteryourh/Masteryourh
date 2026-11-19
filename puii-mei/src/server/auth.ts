/**
 * Autentificare minimă (HTTP Basic) pentru panoul de administrare și pentru curier.
 * - Admin: ADMIN_USER + ADMIN_PASSWORD (panoul /admin e activ doar dacă sunt setate).
 * - Curier: COURIER_USER + COURIER_PASSWORD (pagina /curier); adminul are și el acces.
 * Va fi înlocuită de conturi reale într-o etapă următoare.
 */
export function adminEnabled() {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);
}

export function courierEnabled() {
  return Boolean(process.env.COURIER_USER && process.env.COURIER_PASSWORD);
}

function credentials(header: string | null) {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

export function isValidAdminAuthorization(header: string | null) {
  const c = credentials(header);
  if (!adminEnabled() || !c) return false;
  return safeEqual(c.user, process.env.ADMIN_USER!) && safeEqual(c.pass, process.env.ADMIN_PASSWORD!);
}

export function isValidCourierAuthorization(header: string | null) {
  if (isValidAdminAuthorization(header)) return true;
  const c = credentials(header);
  if (!courierEnabled() || !c) return false;
  return safeEqual(c.user, process.env.COURIER_USER!) && safeEqual(c.pass, process.env.COURIER_PASSWORD!);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verificare în server actions (pe lângă proxy). Aruncă eroare dacă nu e admin. */
export async function requireAdmin() {
  const { headers } = await import("next/headers");
  const h = await headers();
  if (!isValidAdminAuthorization(h.get("authorization"))) throw new Error("Neautorizat");
}

/** Verificare în server actions pentru curier (sau admin). */
export async function requireCourier() {
  const { headers } = await import("next/headers");
  const h = await headers();
  if (!isValidCourierAuthorization(h.get("authorization"))) throw new Error("Neautorizat");
}
