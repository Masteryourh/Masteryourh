import type { UserRole } from "./domain";

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  gospodar: "Gospodar",
  investitor: "Investitor",
  "manager-local": "Manager local",
  "manager-zonal": "Manager zonal",
  client: "Client",
};

/** Pagina de start a fiecărui rol după autentificare. */
export const roleHome: Record<UserRole, string> = {
  admin: "/admin",
  gospodar: "/cont/gospodar",
  investitor: "/cont/investitor",
  "manager-local": "/cont/manager",
  "manager-zonal": "/cont/manager",
  client: "/cont/client",
};
