/**
 * Politica economică a lotului (decontul gospodăriei și onorariul PUII MEI), VERSIONATĂ și FAIL-CLOSED.
 *
 * Mandatul fondatorului (26.11.2026, PR #62): „politicile economice neconfirmate rămân configurabile și blochează doar
 * execuția dependentă, nu construcția”; „policy versioned, simulare, fail closed la finalizare dependentă, fără valori
 * inventate”.
 *
 * - Fiecare parametru are o valoare SAU `null` = DESCHIS (nedecis). Valorile au sursa deciziei.
 * - `settleLot` (decontul final) refuză să calculeze cât timp lipsește un parametru de care depinde (fail closed).
 * - `simulateLot` calculează cu valori date EXPLICIT de cel care simulează; rezultatul e marcat „simulare”, nu decont.
 * Funcții pure, testate unitar (economic-policy.test.ts). Fără bani transferați prin platformă.
 */

/** Formula onorariului: (a) procent din profitul lotului (ADR-001) sau (b) tarif fix pe kg. DESCHIS (D1a). */
export type FeeFormula = { kind: "procent-profit"; percent: number } | { kind: "tarif-kg"; leiPerKg: number };

/** Ce se întâmplă economic cu pierderile după ziua 21 (biologic se înregistrează oricum). DESCHIS. */
export type PostWindowLossTreatment = "rezerva" | "risc-gospodar" | "impartit";

export type Reserve = { kind: "procent-venit"; percent: number; beforeFee: boolean };

export type EconomicPolicy = {
  version: string;
  /** Unitatea de decontare. CONFIRMAT 26.11.2026: lotul. */
  settlementUnit: "lot";
  /** Baza veniturilor. CONFIRMAT 26.11.2026: kg totale ale lotului (× preț pe kg). */
  revenueBasis: "kg-totale-lot";
  /** Cheltuielile eligibile. CONFIRMAT 26.11.2026: doar cele ale lotului (fără cheltuieli gospodărești, fără investiții). */
  eligibleCosts: "doar-lot";
  /** Fereastra de mortalitate în zile de la pornirea lotului. CONFIRMAT 26.11.2026: 21. */
  mortalityWindowDays: number;
  feeFormula: FeeFormula | null;
  /**
   * Rezerva pentru pierderile din mortalitate: DESCHIS („de gândit”). `beforeFee`: rezerva se scade din baza onorariului
   * (true) sau doar din partea gospodăriei (false) — tot decizie, nu presupunere.
   */
  mortalityReserve: Reserve | null;
  postWindowLoss: PostWindowLossTreatment | null;
  /** Cine aprobă cheltuielile lotului (independent de gospodar, review #82 F3). DESCHIS. */
  costApprover: "manager-local" | "manager-zonal" | "financiar" | null;
  /** Sursa fiecărei decizii (comentariu PR / DEC din Notion). */
  sources: Partial<Record<keyof Omit<EconomicPolicy, "version" | "sources">, string>>;
};

/** Politica în vigoare. Se schimbă DOAR printr-o versiune nouă, la decizia fondatorului. */
export const CURRENT_POLICY: EconomicPolicy = {
  version: "2026-11-26.1",
  settlementUnit: "lot",
  revenueBasis: "kg-totale-lot",
  eligibleCosts: "doar-lot",
  mortalityWindowDays: 21,
  feeFormula: null,
  mortalityReserve: null,
  postWindowLoss: null,
  costApprover: null,
  sources: {
    settlementUnit: "Fondator, 26.11.2026 (#62, comentariul 7185596412): „Onorariul se calculează din kg totale pe lot”",
    revenueBasis: "Fondator, 26.11.2026 (#62, comentariul 7185596412)",
    eligibleCosts: "Fondator, 26.11.2026: „Cheltuielile eligibile sunt doar legate de lot, fără alte cheltuieli gospodărești”",
    mortalityWindowDays: "Fondator, 26.11.2026: „Până la 21 de zile e mortalitate”",
  },
};

/** Câmpurile de care depinde decontul final și care sunt încă DESCHISE în politică. */
export function missingForSettlement(p: EconomicPolicy): string[] {
  const missing: string[] = [];
  if (!p.feeFormula) missing.push("formula onorariului (procent din profit sau tarif pe kg)");
  if (!p.mortalityReserve) missing.push("rezerva pentru pierderile din mortalitate");
  if (!p.postWindowLoss) missing.push("tratamentul pierderilor după ziua " + p.mortalityWindowDays);
  if (!p.costApprover) missing.push("cine aprobă cheltuielile lotului");
  return missing;
}

/** Faza unei pierderi față de pornirea lotului: în fereastra de mortalitate sau după. Zilele se numără de la 0. */
export function mortalityPhase(lotStartIso: string, eventIso: string, windowDays: number): "fereastra" | "dupa-fereastra" {
  const day = Math.floor((Date.parse(eventIso.slice(0, 10)) - Date.parse(lotStartIso.slice(0, 10))) / 86_400_000);
  return day <= windowDays ? "fereastra" : "dupa-fereastra";
}

export type LotInput = {
  /** Kg totale ale lotului (cântărite la livrare). */
  totalKg: number;
  /** Prețul pe kg (lei) din contract. */
  pricePerKg: number;
  /** Cheltuielile lotului APROBATE (lei); cele neaprobate nu intră. */
  approvedLotCosts: number;
  /** Cheltuielile încă neaprobate: blochează decontul final. */
  pendingLotCosts: number;
  /** Lotul e închis operațional (livrat integral)? */
  closed: boolean;
};

export type Settlement = {
  kind: "decont" | "simulare";
  policyVersion: string;
  revenue: number;
  eligibleCosts: number;
  reserve: number;
  profit: number;
  fee: number;
  householdNet: number;
  formula: string;
};

/** Rotunjire la bani (2 zecimale), fără erori de virgulă mobilă la afișare. Regula fiscală de rotunjire: DESCHIS. */
const money = (v: number) => Math.round(v * 100) / 100;

function compute(input: LotInput, fee: FeeFormula, r: Reserve, policyVersion: string, kind: Settlement["kind"]): Settlement {
  const revenue = money(input.totalKg * input.pricePerKg);
  const reserve = money((revenue * r.percent) / 100);
  const profit = money(revenue - input.approvedLotCosts);
  const feeBase = r.beforeFee ? money(profit - reserve) : profit;
  const feeValue = fee.kind === "procent-profit" ? money((Math.max(0, feeBase) * fee.percent) / 100) : money(input.totalKg * fee.leiPerKg);
  return {
    kind,
    policyVersion,
    revenue,
    eligibleCosts: money(input.approvedLotCosts),
    reserve,
    profit,
    fee: feeValue,
    householdNet: money(profit - reserve - feeValue),
    formula:
      fee.kind === "procent-profit"
        ? `${fee.percent}% × max(0, ${input.totalKg} kg × ${input.pricePerKg} lei − ${input.approvedLotCosts} lei cheltuieli${r.beforeFee ? ` − ${reserve} lei rezervă` : ""})`
        : `${input.totalKg} kg × ${fee.leiPerKg} lei/kg`,
  };
}

function validInput(i: LotInput): string | null {
  for (const [k, v] of Object.entries({ totalKg: i.totalKg, pricePerKg: i.pricePerKg, approvedLotCosts: i.approvedLotCosts, pendingLotCosts: i.pendingLotCosts })) {
    if (!Number.isFinite(v) || v < 0) return `valoare invalidă: ${k}`;
  }
  return null;
}

/**
 * Decontul FINAL al lotului: doar cu politica în vigoare, complet decisă, pe un lot închis și fără cheltuieli în
 * așteptare. Altfel: blocat, cu motivele (fail closed). Nu inventează valori.
 */
export function settleLot(input: LotInput, policy: EconomicPolicy = CURRENT_POLICY): { ok: true; settlement: Settlement } | { ok: false; blockedBy: string[] } {
  const blockedBy = [...missingForSettlement(policy)];
  const invalid = validInput(input);
  if (invalid) blockedBy.push(invalid);
  if (!input.closed) blockedBy.push("lotul nu e închis");
  if (input.pendingLotCosts > 0) blockedBy.push("există cheltuieli ale lotului neaprobate");
  if (blockedBy.length) return { ok: false, blockedBy };
  return { ok: true, settlement: compute(input, policy.feeFormula!, policy.mortalityReserve!, policy.version, "decont") };
}

/**
 * Simulare: aceleași calcule, cu parametrii DESCHIȘI dați explicit de cel care simulează (ex. „ce-ar fi dacă rezerva
 * ar fi 3%”). Nu e decont, nu se salvează ca decizie; parametrii deciși ai politicii nu pot fi suprascriși.
 */
export function simulateLot(input: LotInput, assumptions: { feeFormula: FeeFormula; reserve: Reserve }, policy: EconomicPolicy = CURRENT_POLICY): { ok: true; settlement: Settlement } | { ok: false; error: string } {
  const invalid = validInput(input);
  if (invalid) return { ok: false, error: invalid };
  const f = assumptions.feeFormula;
  if (f.kind === "procent-profit" && !(f.percent >= 0 && f.percent <= 100)) return { ok: false, error: "procent invalid" };
  if (f.kind === "tarif-kg" && !(f.leiPerKg >= 0)) return { ok: false, error: "tarif invalid" };
  if (!(assumptions.reserve.percent >= 0 && assumptions.reserve.percent <= 100)) return { ok: false, error: "rezervă invalidă" };
  return { ok: true, settlement: compute(input, f, assumptions.reserve, `${policy.version}+simulare`, "simulare") };
}
