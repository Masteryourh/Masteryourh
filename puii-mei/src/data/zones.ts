import type { DeliveryZone } from "@/lib/domain";

/** Zone de livrare pentru faza pilot. */
export const deliveryZones: DeliveryZone[] = [
  {
    id: "cluj-napoca",
    name: "Cluj-Napoca",
    localities: "Toate cartierele",
    fee: 15,
    deliveryDay: "Sâmbătă",
    active: true,
  },
  {
    id: "floresti-baciu",
    name: "Florești, Baciu, Gilău",
    localities: "Florești, Baciu, Gilău, Luna de Sus",
    fee: 20,
    deliveryDay: "Sâmbătă",
    active: true,
  },
  {
    id: "apahida-jucu",
    name: "Apahida, Jucu, Bonțida",
    localities: "Apahida, Sânnicoară, Jucu, Bonțida",
    fee: 20,
    deliveryDay: "Vineri",
    active: true,
  },
  {
    id: "turda-campia-turzii",
    name: "Turda, Câmpia Turzii",
    localities: "Turda, Câmpia Turzii, Mihai Viteazu",
    fee: 25,
    deliveryDay: "Vineri",
    active: true,
  },
  {
    id: "ridicare-personala",
    name: "Ridicare personală",
    localities: "Punct de ridicare Cluj-Napoca (adresa se comunică la confirmare)",
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
