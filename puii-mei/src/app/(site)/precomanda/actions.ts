"use server";

import { revalidatePath } from "next/cache";
import { estimatePrice, feedAdvance } from "@/lib/pricing";
import { currentPricePerKg } from "@/server/repositories/settings";
import { farmPaymentRepository } from "@/server/repositories/farm-payments";
import { availabilityDate } from "@/lib/lots";
import { allocateNewPreorder } from "@/server/allocation";
import { flattenErrors } from "@/lib/validation/common";
import { parseLocation, preorderSchema } from "@/lib/validation/preorder";
import { farmRepository, zoneRepository } from "@/server/repositories/catalog";
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

  try {
    const preorder = await preorderRepository.create({
      customer: { name: data.name, phone: data.phone, email: data.email },
      birds: data.birds,
      lotCode: null,
      zoneId: zone.id,
      address: data.address,
      ...(data.zoneId !== "ridicare-personala" && data.zoneId !== "alta-zona"
        ? { location: parseLocation(data.lat, data.lng) ?? undefined, addressNote: data.addressNote }
        : {}),
      notes: data.notes,
      estimate: estimatePrice(data.birds, zone, await currentPricePerKg()),
      marketingConsent: data.marketingConsent,
    });
    await notifyNewPreorder(preorder);
    // Alocarea automată: primul loc disponibil în care încape toată comanda.
    const alloc = await allocateNewPreorder(preorder);
    revalidatePath("/", "layout");
    const lot = alloc.kind === "alocata" ? alloc.lot : null;
    const [payment, farm] = lot
      ? await Promise.all([farmPaymentRepository.bySlug(lot.farmSlug), farmRepository.bySlug(lot.farmSlug, { includeInactive: true })])
      : [null, null];
    const feed = feedAdvance(preorder.birds, payment?.feedPricePerKg, payment?.chickPricePerBird);

    return {
      status: "success",
      result: {
        number: preorder.number,
        birds: preorder.birds,
        lotCode: lot?.code ?? null,
        allocation: alloc.kind,
        farmName: farm?.name ?? null,
        maxSingle: alloc.kind === "alegere" ? alloc.maxSingle : 0,
        availableFrom: lot ? availabilityDate(lot).toISOString() : null,
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
