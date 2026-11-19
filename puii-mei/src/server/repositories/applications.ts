import "server-only";
import { randomUUID } from "node:crypto";
import type { FarmApplication, FarmApplicationStatus, InvestorApplication } from "@/lib/domain";
import { store } from "@/server/db/store";

const COLLECTION = "farm-applications";

export type NewFarmApplication = Omit<FarmApplication, "id" | "createdAt" | "status" | "internalNote" | "farmSlug">;

export const applicationRepository = {
  async create(data: NewFarmApplication) {
    const app: FarmApplication = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "noua",
      internalNote: "",
    };
    return store.append(COLLECTION, app);
  },
  async list() {
    const items = await store.list<FarmApplication>(COLLECTION);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async byId(id: string) {
    return (await store.list<FarmApplication>(COLLECTION)).find((a) => a.id === id) ?? null;
  },
  async update(id: string, patch: Partial<Pick<FarmApplication, "status" | "internalNote" | "farmSlug">>) {
    return store.update<FarmApplication>(COLLECTION, id, patch);
  },
};

const INVESTORS = "investor-applications";

export type NewInvestorApplication = Omit<InvestorApplication, "id" | "createdAt" | "status" | "internalNote">;

export const investorRepository = {
  async create(data: NewInvestorApplication) {
    const app: InvestorApplication = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "noua",
      internalNote: "",
    };
    return store.append(INVESTORS, app);
  },
  async list() {
    const items = await store.list<InvestorApplication>(INVESTORS);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async update(id: string, patch: Partial<Pick<InvestorApplication, "status" | "internalNote">>) {
    return store.update<InvestorApplication>(INVESTORS, id, patch);
  },
};

export const applicationStatusLabels: Record<FarmApplicationStatus, string> = {
  noua: "Nouă",
  "in-evaluare": "În evaluare",
  "vizita-programata": "Vizită programată",
  aprobata: "Aprobată",
  respinsa: "Respinsă",
};
