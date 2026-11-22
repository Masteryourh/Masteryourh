import type { Lot, Preorder } from "./domain";
import { GROWTH } from "./growth";

/**
 * Țarcurile în care stau puii unei comenzi: țarcurile se umplu în ordinea precomenzilor
 * (40 de pui fiecare), deci o comandă poate fi într-unul sau în mai multe țarcuri.
 */
export function orderPens(order: Preorder, lot: Lot, lotOrders: Preorder[]): number[] {
  const live = lotOrders
    .filter((p) => p.lotCode === lot.code && p.status !== "anulata")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let before = 0;
  for (const p of live) {
    if (p.id === order.id) break;
    before += p.birds;
  }
  const first = Math.floor(before / GROWTH.birdsPerPen) + 1;
  const last = Math.floor((before + Math.max(1, order.birds) - 1) / GROWTH.birdsPerPen) + 1;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** Pozițiile țarcurilor pe imaginea aeriană (procente), pe pășune. */
export function penSpots(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const cols = Math.min(n, 4);
    const row = Math.floor(i / cols);
    const col = i % cols;
    return { x: 26 + (cols === 1 ? 46 : (col * 50) / (cols - 1)), y: 78 - row * 16 - (col % 2) * 6 };
  });
}

export interface PenOrder {
  number: string;
  name: string;
  /** Puii acestei comenzi din țarcul respectiv. */
  birds: number;
  /** Totalul comenzii (poate fi împărțită pe mai multe țarcuri). */
  total: number;
  token?: string;
  pens: number[];
}

/** Ce comenzi sunt în fiecare țarc (umplere în ordinea precomenzilor, 40 de pui / țarc). */
export function penOrders(lot: Lot, orders: Preorder[]): Map<number, PenOrder[]> {
  const live = orders
    .filter((p) => p.lotCode === lot.code && p.status !== "anulata")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const map = new Map<number, PenOrder[]>();
  let filled = 0;
  for (const p of live) {
    let left = p.birds;
    const pens: number[] = [];
    const parts: [number, number][] = [];
    while (left > 0) {
      const pen = Math.floor(filled / GROWTH.birdsPerPen) + 1;
      const room = GROWTH.birdsPerPen - (filled % GROWTH.birdsPerPen);
      const take = Math.min(room, left);
      parts.push([pen, take]);
      pens.push(pen);
      filled += take;
      left -= take;
    }
    const first = p.customer.name.trim().split(/\s+/);
    const name = first.length > 1 ? `${first[0]} ${first[first.length - 1][0]}.` : first[0] ?? "";
    for (const [pen, birds] of parts) {
      map.set(pen, [...(map.get(pen) ?? []), { number: p.number, name, birds, total: p.birds, token: p.trackingToken, pens }]);
    }
  }
  return map;
}
