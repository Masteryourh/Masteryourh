export const site = {
  name: "Puii mei",
  slogan: "Crescuți pentru tine.",
  tagline: "Știi ce comanzi. Știi unde cresc. Știi ce ajunge pe masa ta.",
  description:
    "Puii mei – pui de carne crescuți la comandă în gospodării locale partenere. Precomanzi online, urmărești creșterea lotului tău și primești carne proaspătă, din gospodăria în care a crescut.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.puiimei.ro",
  locale: "ro_RO",
  company: {
    legalName: "Puii mei S.R.L. (în curs de înființare)",
    cui: "—",
    regCom: "—",
    address: "România",
    email: "contact@puiimei.ro",
    phone: "+40 700 000 000",
    schedule: "Luni – Vineri, 09:00 – 18:00",
  },
} as const;

export const mainNav = [
  { href: "/cum-functioneaza", label: "Cum funcționează" },
  { href: "/gospodarii", label: "Gospodării partenere" },
  { href: "/trasabilitate", label: "Trasabilitate" },
  { href: "/despre-noi", label: "Despre noi" },
  { href: "/devino-partener", label: "Devino partener" },
  { href: "/contact", label: "Contact" },
] as const;
