/** Biblioteca de legislație și surse (administrată de admin, vizibilă gospodarilor). */
export type LegalKind = "lege" | "ghid" | "stire";

export const legalKindLabels: Record<LegalKind, string> = {
  lege: "Legislație",
  ghid: "Ghiduri și instituții",
  stire: "Știri",
};

export interface LegalEntry {
  id: string;
  kind: LegalKind;
  title: string;
  url: string;
  summary: string;
  /** Data actului / știrii (AAAA-LL-ZZ), opțional. */
  date?: string;
  /** Confirmat (de jurist / DSVSA) că e în vigoare și se aplică. */
  verified: boolean;
  archived?: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}
