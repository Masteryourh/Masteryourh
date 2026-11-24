"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { hashPassword } from "@/server/password";
import { farmRepository } from "@/server/repositories/catalog";
import { investmentRepository } from "@/server/repositories/documents";
import { userRepository } from "@/server/repositories/users";
import { auditedAction } from "@/server/audit";

export type DemoAccountsState =
  | { status: "idle" }
  | { status: "done"; accounts: { name: string; email: string; password: string; role: string }[]; skipped: string[] };

const ALPHABET = "abcdefghjkmnpqrstuvwxyz";
/** Parolă ușor de dictat: 3 grupe de litere + cifre (ex. „pui-kmrt-4821-vbnq”). */
function readablePassword() {
  const letters = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `pui-${letters(4)}-${String(randomInt(1000, 9999))}-${letters(4)}`;
}

/**
 * Conturi de test, gata de folosit: câte un gospodar pentru fiecare gospodărie fără cont
 * și un investitor cu o investiție demonstrativă. Parolele se afișează o singură dată.
 */
async function createDemoAccounts__impl(): Promise<DemoAccountsState> {
  const admin = await requireAdmin();
  const [farms, users] = await Promise.all([farmRepository.listAll(), userRepository.list()]);
  const accounts: { name: string; email: string; password: string; role: string }[] = [];
  const skipped: string[] = [];

  async function make(name: string, email: string, role: "gospodar" | "investitor", farmSlug?: string) {
    if (users.some((u) => u.email === email)) {
      skipped.push(email);
      return null;
    }
    const password = readablePassword();
    const user = await userRepository.create({ name, email, phone: "", role, farmSlug });
    await userRepository.update(user.id, {
      status: "activ",
      passwordHash: await hashPassword(password),
      setupToken: undefined,
      setupExpiresAt: undefined,
    });
    accounts.push({ name, email, password, role: role === "gospodar" ? "Gospodar" : "Investitor" });
    return user;
  }

  for (const f of farms) {
    if (users.some((u) => u.role === "gospodar" && u.farmSlug === f.slug)) {
      skipped.push(`${f.name} (are deja cont de gospodar)`);
      continue;
    }
    await make(`Gospodar – ${f.name}`, `gospodar.${f.slug}@demo.puiimei.ro`, "gospodar", f.slug);
  }

  const investor = await make("Investitor de test", "investitor@demo.puiimei.ro", "investitor");
  if (investor) {
    const farm = farms.find((f) => f.slug === "gospodaria-hreniuc") ?? farms[0];
    const today = new Date().toISOString().slice(0, 10);
    await investmentRepository.create({
      investorId: investor.id,
      title: `Adăpost nou pentru 300 de pui${farm ? ` – ${farm.name}` : ""} (demonstrativ)`,
      description: "Investiție demonstrativă, pentru a vedea cum arată contul investitorului. Se poate anula din admin.",
      amount: 25000,
      date: today,
      status: "activa",
      farmSlug: farm?.slug,
      terms: "Exemplu: 8% pe an, plătit trimestrial",
      events: [
        { at: new Date().toISOString(), date: today, title: "Contract semnat", text: "Exemplu de eveniment în cronologie.", by: `${admin.name} (admin)` },
      ],
      createdBy: `${admin.name} (admin)`,
    });
  }

  revalidatePath("/admin", "layout");
  return { status: "done", accounts, skipped };
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const createDemoAccounts = auditedAction({ action: "admin.demo.createDemoAccounts", workspace: "admin", resourceType: "demo", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, createDemoAccounts__impl);
