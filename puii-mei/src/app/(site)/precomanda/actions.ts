"use server";

import { estimatePrice, feedAdvance } from "@/lib/pricing";
import { farmPaymentRepository } from "@/server/repositories/farm-payments";
import { availableBirds, availabilityDate, isOpenForPreorder, normalizeLotCode } from "@/lib/lots";
import { flattenErrors } from "@/lib/validation/common";
import { parseLocation, preorderSchema } from "@/lib/validation/preorder";
import { lotRepository, zoneRepository } from "@/server/repositories/catalog";
import { preorderRepository } from "@/server/repositories/preorders";
import { notifyNewPreorder } from "@/server/notifications";
import type { PreorderFormState } from "./form-state";

export async function submitPreorder(
  _prev: PreorderFormState,
  formData: FormData,
): Promise<PreorderFormState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  ) as Record<string, string>;

  const parsed = preorderSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", errors: flattenErrors(parsed.error), values: raw };
  }
  const data = parsed.data;

  // Câmpul capcană completat → probabil bot. Răspundem neutru.
  if (data.website) {
    return { status: "error", errors: { form: "Cererea nu a putut fi procesată." }, values: raw };
  }

  const zone = await zoneRepository.byId(data.zoneId);
  if (!zone) {
    return { status: "error", errors: { zoneId: "Zona de livrare aleasă nu este disponibilă." }, values: raw };
  }

  let lotCode: string | null = null;
  let farmSlug: string | null = null;
  let availableFrom: string | null = null;
  if (data.lotCode) {
    const code = normalizeLotCode(data.lotCode);
    const lot = (await lotRepository.openForPreorder()).find((l) => l.code === code);
    if (!lot || !isOpenForPreorder(lot)) {
      return { status: "error", errors: { lotCode: "Lotul ales nu mai acceptă precomenzi." }, values: raw };
    }
    if (availableBirds(lot) < data.birds) {
      return {
        status: "error",
        errors: { birds: `În lotul ${lot.code} mai sunt disponibili doar ${availableBirds(lot)} pui.` },
        values: raw,
      };
    }
    lotCode = lot.code;
    farmSlug = lot.farmSlug;
    availableFrom = availabilityDate(lot).toISOString();
  }

  try {
    const preorder = await preorderRepository.create({
      customer: { name: data.name, phone: data.phone, email: data.email },
      birds: data.birds,
      lotCode,
      zoneId: zone.id,
      address: data.address,
      ...(data.zoneId !== "ridicare-personala" && data.zoneId !== "alta-zona"
        ? { location: parseLocation(data.lat, data.lng) ?? undefined, addressNote: data.addressNote }
        : {}),
      notes: data.notes,
      estimate: estimatePrice(data.birds, zone),
      marketingConsent: data.marketingConsent,
    });
    await notifyNewPreorder(preorder);
    const payment = farmSlug ? await farmPaymentRepository.bySlug(farmSlug) : null;
    const feed = feedAdvance(preorder.birds, payment?.feedPricePerKg);

    return {
      status: "success",
      result: {
        number: preorder.number,
        birds: preorder.birds,
        lotCode,
        availableFrom,
        zoneName: zone.name,
        total: preorder.estimate.total,
        estimatedKg: preorder.estimate.estimatedKg,
        email: preorder.customer.email,
        trackingToken: preorder.trackingToken!,
        feedKg: feed.kg,
        feedAmount: feed.amount,
      },
    };
  } catch (err) {
    console.error("[puii-mei] Eroare la salvarea precomenzii", err);
    return {
      status: "error",
      errors: { form: "A apărut o eroare la salvare. Te rugăm să încerci din nou sau să ne suni." },
      values: raw,
    };
  }
}
