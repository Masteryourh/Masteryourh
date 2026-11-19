const lei = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Bucharest",
});
const shortDateFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Bucharest",
});

export const formatLei = (v: number) => lei.format(v);
export const formatNumber = (v: number) => num.format(v);
export const formatDate = (d: Date | string) => dateFmt.format(toDate(d));
export const formatShortDate = (d: Date | string) => shortDateFmt.format(toDate(d));

function toDate(d: Date | string) {
  return typeof d === "string" ? new Date(`${d.length === 10 ? `${d}T12:00:00` : d}`) : d;
}
