/** Un lucru care cere o acțiune azi, cu legătura directă spre locul în care se rezolvă (Admin › Astăzi, gospodar). */
export type TodayItem = {
  id: string;
  kind: string;
  severity: "urgent" | "atentie" | "info";
  title: string;
  detail: string;
  href: string;
  action: string;
};

const rank: Record<TodayItem["severity"], number> = { urgent: 0, atentie: 1, info: 2 };
/** Urgente primele, apoi ce așteaptă o acțiune, apoi informările (ordinea din fiecare grup se păstrează). */
export const bySeverity = (items: TodayItem[]) => [...items].sort((a, b) => rank[a.severity] - rank[b.severity]);
