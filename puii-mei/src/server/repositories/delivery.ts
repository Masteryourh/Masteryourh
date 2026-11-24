import "server-only";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import type { Parcel, StoredPhoto, Tour, TourEvent } from "@/lib/domain";
import { store } from "@/server/db/store";
import { readContent, sha256, storeContent } from "@/server/files/content";

const PARCELS = "parcels";
const TOURS = "tours";
const EVENTS = "tour-events";
const PHOTOS = "photos";

export const newToken = () => randomBytes(24).toString("base64url");
export const newPin = () => String(randomInt(0, 10000)).padStart(4, "0");
const validToken = (t: string) => /^[A-Za-z0-9_-]{20,}$/.test(t);

export const parcelRepository = {
  async list() {
    return store.list<Parcel>(PARCELS);
  },
  async byId(id: string) {
    return store.get<Parcel>(PARCELS, id);
  },
  async byClientToken(token: string) {
    if (!validToken(token)) return null;
    return (await store.findBy<Parcel>(PARCELS, "clientToken", token))[0] ?? null;
  },
  async byCourierToken(token: string) {
    if (!validToken(token)) return null;
    return (await store.findBy<Parcel>(PARCELS, "courierToken", token))[0] ?? null;
  },
  async byRatingToken(token: string) {
    if (!validToken(token)) return null;
    return (await store.findBy<Parcel>(PARCELS, "ratingToken", token))[0] ?? null;
  },
  /** Un cod vechi, înlocuit la regenerarea etichetei? */
  async replacedBy(token: string) {
    if (!validToken(token)) return null;
    const [asClient, asCourier] = await Promise.all([
      store.findContaining<Parcel>(PARCELS, "replacedTokens", { clientToken: token }),
      store.findContaining<Parcel>(PARCELS, "replacedTokens", { courierToken: token }),
    ]);
    return asClient[0] ?? asCourier[0] ?? null;
  },
  async byFarm(slug: string) {
    return store.findBy<Parcel>(PARCELS, "farmSlug", slug);
  },
  async create(p: Parcel) {
    return store.append(PARCELS, p);
  },
  async update(id: string, patch: Partial<Parcel>) {
    return store.update<Parcel>(PARCELS, id, patch);
  },
};

export const tourRepository = {
  async list() {
    const items = await store.list<Tour>(TOURS);
    return items.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  },
  async byId(id: string) {
    return store.get<Tour>(TOURS, id);
  },
  async byToken(token: string) {
    if (!validToken(token)) return null;
    return (await store.findBy<Tour>(TOURS, "token", token))[0] ?? null;
  },
  async byFarm(slug: string) {
    return (await store.findBy<Tour>(TOURS, "farmSlug", slug)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  },
  async create(data: Omit<Tour, "id" | "code" | "token" | "pickupPin" | "createdAt" | "failedPins" | "locked" | "extensions" | "status">) {
    const count = (await store.list<Tour>(TOURS)).length + 1;
    const tour: Tour = {
      ...data,
      id: randomUUID(),
      code: `TUR-${data.date.replace(/-/g, "").slice(2)}-${String(count).padStart(3, "0")}`,
      token: newToken(),
      pickupPin: newPin(),
      createdAt: new Date().toISOString(),
      status: "planificata",
      failedPins: 0,
      locked: false,
      extensions: [],
    };
    return store.append(TOURS, tour);
  },
  async update(id: string, patch: Partial<Tour>) {
    return store.update<Tour>(TOURS, id, patch);
  },
};

/** Jurnalul turei: doar adăugare, nimic nu se modifică sau șterge. */
export const eventRepository = {
  async add(e: Omit<TourEvent, "id" | "at">) {
    return store.append(EVENTS, { ...e, id: randomUUID(), at: new Date().toISOString() });
  },
  async forTour(tourId: string) {
    const items = await store.findBy<TourEvent>(EVENTS, "tourId", tourId);
    return items.sort((a, b) => a.at.localeCompare(b.at));
  },
  async all() {
    return store.list<TourEvent>(EVENTS);
  },
};

export const photoRepository = {
  /** Salvează o fotografie trimisă din formular (File): conținutul în stocarea externă, dacă e configurată. */
  async save(file: File, owner: string) {
    const buf = Buffer.from(await file.arrayBuffer());
    const id = randomUUID();
    const mime = file.type || "image/jpeg";
    const content = await storeContent("photos", id, buf, mime);
    const photo: StoredPhoto = { id, mime, ...content, size: buf.length, sha256: sha256(buf), at: new Date().toISOString(), owner };
    await store.append(PHOTOS, photo);
    return photo.id;
  },
  async get(id: string) {
    return store.get<StoredPhoto>(PHOTOS, id);
  },
  /** Conținutul fotografiei (din stocarea externă sau din baza de date). */
  content: (photo: StoredPhoto) => readContent(photo),
};
