import type { DeliveryZone } from "@/lib/domain";

/** Zone de livrare pentru faza pilot: Bucovina, județul Suceava. */
export const deliveryZones: DeliveryZone[] = [
  {
    id: "campulung-moldovenesc",
    name: "Câmpulung Moldovenesc",
    localities: "Câmpulung Moldovenesc, Pojorâta, Vama, Fundu Moldovei",
    fee: 15,
    deliveryDay: "Sâmbătă",
    active: true,
  },
  {
    id: "vatra-dornei",
    name: "Vatra Dornei",
    localities: "Vatra Dornei, Dorna Candrenilor, Iacobeni, Șaru Dornei",
    fee: 20,
    deliveryDay: "Sâmbătă",
    active: true,
  },
  {
    id: "gura-humorului",
    name: "Gura Humorului",
    localities: "Gura Humorului, Mănăstirea Humorului, Frasin, Vatra Moldoviței",
    fee: 20,
    deliveryDay: "Vineri",
    active: true,
  },
  {
    id: "suceava",
    name: "Suceava",
    localities: "Municipiul Suceava, Ipotești, Șcheia",
    fee: 25,
    deliveryDay: "Vineri",
    active: true,
  },
  {
    id: "radauti",
    name: "Rădăuți",
    localities: "Rădăuți, Marginea, Sucevița",
    fee: 25,
    deliveryDay: "Vineri",
    active: true,
  },
  {
    id: "ridicare-personala",
    name: "Ridicare personală",
    localities: "Punct de ridicare în Câmpulung Moldovenesc (adresa se comunică la confirmare)",
    fee: 0,
    deliveryDay: "Vineri sau sâmbătă",
    active: true,
  },
  {
    id: "alta-zona",
    name: "Altă zonă (listă de așteptare)",
    localities: "Te anunțăm când extindem livrările în zona ta",
    fee: 0,
    deliveryDay: "—",
    active: true,
  },
];
