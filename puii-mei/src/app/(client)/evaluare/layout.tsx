import { ClientFrame } from "@/components/orders/ClientFrame";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientFrame>{children}</ClientFrame>;
}
