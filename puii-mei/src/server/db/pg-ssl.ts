/**
 * Setările TLS pentru PostgreSQL. Conexiunile la distanță (ex. Neon) verifică ÎNTOTDEAUNA
 * certificatul serverului; opțional, un certificat CA propriu în DATABASE_CA_CERT (PEM).
 * Fără TLS doar pentru baza locală (localhost / socket).
 */
export function isLocalDatabase(connectionString: string) {
  return /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString) || connectionString.includes("host=/");
}

export function pgSslConfig(connectionString: string, env: Record<string, string | undefined> = process.env) {
  if (isLocalDatabase(connectionString)) return undefined;
  const ca = env.DATABASE_CA_CERT?.trim();
  return { rejectUnauthorized: true as const, ...(ca ? { ca } : {}) };
}
