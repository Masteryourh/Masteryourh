/**
 * Modul „în construcție”.
 *
 * MAINTENANCE_MODE=1  → vizitatorii văd doar pagina /in-constructie.
 * PREVIEW_KEY=<secret> → cine deschide /acces?cheie=<secret> vede site-ul complet
 *                        (cookie valabil 30 de zile).
 * Panoul /admin rămâne accesibil cu utilizator și parolă.
 */
export const PREVIEW_COOKIE = "puii_preview";

export function maintenanceEnabled() {
  const v = (process.env.MAINTENANCE_MODE ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "da";
}

export function previewKey() {
  return (process.env.PREVIEW_KEY ?? "").trim();
}

export function isValidPreviewKey(value: string | undefined | null) {
  const key = previewKey();
  if (!key || !value || value.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ value.charCodeAt(i);
  return diff === 0;
}
