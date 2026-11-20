"use client";

/** Micșorează o fotografie în browser (max. 1280 px, JPEG), ca trimiterea să fie rapidă. */
export async function compressImage(file: File, max = 1280, quality = 0.72): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return (await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality))) ?? file;
  } catch {
    return file;
  }
}

/** Poziția GPS curentă (sau null dacă nu e permisă / nu răspunde în 10 s). */
export function currentPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

/**
 * Pregătește FormData: comprimă fotografiile (câmpurile de tip fișier) și
 * adaugă poziția GPS în `lat`, `lng`, `accuracy`.
 */
export async function prepareForm(form: HTMLFormElement, extra?: Record<string, Blob | null>) {
  const fd = new FormData(form);
  for (const [key, value] of [...fd.entries()]) {
    if (value instanceof File && value.size > 0 && value.type.startsWith("image/")) {
      fd.set(key, await compressImage(value), `${key}.jpg`);
    }
  }
  for (const [k, v] of Object.entries(extra ?? {})) if (v) fd.set(k, v, `${k}.png`);
  const pos = await currentPosition();
  if (pos) {
    fd.set("lat", String(pos.lat));
    fd.set("lng", String(pos.lng));
    fd.set("accuracy", String(Math.round(pos.accuracy)));
  }
  return fd;
}
