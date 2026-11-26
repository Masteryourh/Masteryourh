/**
 * Regiunea bazei de date, dedusă DOAR din numele serverului (fără utilizator, parolă sau bază), și regiunea Vercel
 * cea mai apropiată. Funcții pure, testate unitar (db-region.test.ts). Folosite de Admin › Diagnostic tehnic.
 */
const AWS_TO_VERCEL: Record<string, { vercel: string; city: string }> = {
  "us-east-1": { vercel: "iad1", city: "Washington, D.C. (SUA)" },
  "us-east-2": { vercel: "cle1", city: "Cleveland (SUA)" },
  "us-west-2": { vercel: "pdx1", city: "Portland (SUA)" },
  "eu-central-1": { vercel: "fra1", city: "Frankfurt" },
  "eu-west-1": { vercel: "dub1", city: "Dublin" },
  "eu-west-2": { vercel: "lhr1", city: "Londra" },
  "eu-west-3": { vercel: "cdg1", city: "Paris" },
  "eu-north-1": { vercel: "arn1", city: "Stockholm" },
  "ap-southeast-1": { vercel: "sin1", city: "Singapore" },
  "ap-southeast-2": { vercel: "syd1", city: "Sydney" },
  "sa-east-1": { vercel: "gru1", city: "São Paulo" },
};

/** Ex. „ep-x-pooler.eu-central-1.aws.neon.tech” → { region: "eu-central-1", vercel: "fra1", … }; altfel null. */
export function dbRegion(connectionString: string) {
  let host = "";
  try {
    host = new URL(connectionString).hostname;
  } catch {
    return null;
  }
  const m = host.match(/\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech$/);
  if (!m) return null;
  const map = AWS_TO_VERCEL[m[1]];
  return { region: m[1], provider: "Neon (AWS)", vercel: map?.vercel ?? null, city: map?.city ?? null };
}

/**
 * Plafonul de scrieri cu lacătul global al auditului: măsurat în C3 pentru RTT 0 / 2 / 10 ms; peste, ESTIMAT ca
 * 1 / (≈4 drumuri dus-întors ținute sub lacăt), marcat ca estimare.
 */
export function writeCeiling(rttMs: number): { perSecond: number; measured: boolean; row: string } {
  if (rttMs < 1) return { perSecond: 800, measured: true, row: "0 ms" };
  if (rttMs < 6) return { perSecond: 120, measured: true, row: "2 ms" };
  if (rttMs < 15) return { perSecond: 30, measured: true, row: "10 ms" };
  return { perSecond: Math.max(1, Math.round(1000 / (4 * rttMs))), measured: false, row: `${Math.round(rttMs)} ms` };
}
