import type { DocumentCategory, ExpenseCategory, InvestmentStatus } from "./domain";

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  factura: "Factură",
  aviz: "Aviz de însoțire",
  contabil: "Document contabil",
  dsv: "Înregistrare / act DSV",
  contract: "Contract",
  altele: "Alt document",
};

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  pui: "Pui de o zi",
  furaj: "Furaje",
  sanatate: "Sănătate (vaccinuri, veterinar)",
  energie: "Energie / încălzire",
  asternut: "Așternut",
  ambalaje: "Ambalaje",
  transport: "Transport",
  manopera: "Manoperă",
  taxe: "Taxe și avize",
  altele: "Alte cheltuieli",
  "vanzare-carne": "Vânzare carne",
  "avans-hrana": "Avans hrană încasat",
  "alte-venituri": "Alte venituri",
};

/** Categoriile de venit; restul sunt cheltuieli. */
export const INCOME_CATEGORIES: ExpenseCategory[] = ["vanzare-carne", "avans-hrana", "alte-venituri"];
export const isIncomeCategory = (c: ExpenseCategory) => INCOME_CATEGORIES.includes(c);

export const investmentStatusLabels: Record<InvestmentStatus, string> = {
  propusa: "Propusă",
  semnata: "Contract semnat",
  activa: "Activă",
  finalizata: "Finalizată",
  anulata: "Anulată",
};

/** Fișierele acceptate: PDF, imagini, documente Office; maximum 3,5 MB. */
export const FILE_LIMITS = {
  maxBytes: 3.5 * 1024 * 1024,
  accept: ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx",
  mimes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

export const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
