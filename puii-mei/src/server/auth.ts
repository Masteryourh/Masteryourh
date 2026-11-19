/**
 * Autentificare minimă pentru panoul de administrare (HTTP Basic).
 * Panoul este activ doar dacă ADMIN_USER și ADMIN_PASSWORD sunt definite.
 * Va fi înlocuită de conturi reale (clienți / administratori) într-o etapă următoare.
 */
export function adminEnabled() {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);
}

export function isValidAdminAuthorization(header: string | null) {
  if (!adminEnabled() || !header?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    return safeEqual(user, process.env.ADMIN_USER!) && safeEqual(pass, process.env.ADMIN_PASSWORD!);
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
