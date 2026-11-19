import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Container } from "@/components/ui/Container";
import { LogoMark } from "@/components/layout/Logo";
import { PrintButton } from "@/components/admin/PrintButton";
import { clientUrl, courierUrl, ensureLabel, requestOrigin } from "@/server/delivery";
import { zoneRepository } from "@/server/repositories/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Etichetă colet", robots: { index: false, follow: false } };

const qr = (url: string) =>
  QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });

/** Eticheta de lipit pe colet: QR „Curier” + QR „Client”. */
export default async function LabelPage({ params }: PageProps<"/admin/eticheta/[id]">) {
  const { id } = await params;
  const label = await ensureLabel(id);
  if (!label) notFound();
  const { preorder, confirmation } = label;
  const origin = await requestOrigin();
  const [courierQr, clientQr, zones] = await Promise.all([
    qr(courierUrl(origin, confirmation)),
    qr(clientUrl(origin, confirmation)),
    zoneRepository.listActive(),
  ]);
  const zone = zones.find((z) => z.id === preorder.zoneId)?.name ?? preorder.zoneId;

  return (
    <Container className="py-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <p className="max-w-lg text-sm text-muted">
          Tipărește eticheta și lipește-o pe colet. Curierul scanează codul din stânga la predare, clientul pe cel din
          dreapta. Eticheta are 15 × 10 cm.
        </p>
        <PrintButton />
      </div>

      <article className="mx-auto w-[15cm] max-w-full rounded-xl border-2 border-black bg-white p-[0.4cm] text-black print:rounded-none">
        <header className="flex items-center justify-between border-b-2 border-black pb-[0.2cm]">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-[46px]" />
            <span className="font-display text-xl font-semibold">Puii mei</span>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold">{preorder.number}</p>
            <p className="text-xs">
              {preorder.birds} pui{confirmation.lotCode ? ` · lot ${confirmation.lotCode}` : ""}
            </p>
          </div>
        </header>
        <p className="mt-[0.15cm] truncate text-sm">
          <strong>{preorder.customer.name}</strong> · {zone}
          {preorder.address ? ` · ${preorder.address}` : ""}
        </p>
        <div className="mt-[0.2cm] grid grid-cols-2 gap-[0.4cm]">
          <QrBox title="CURIER" text="Scanează la predare și bifează „Livrat”" svg={courierQr} />
          <QrBox title="CLIENT" text="Scanează la primire: verifică și fotografiază coletul" svg={clientQr} />
        </div>
        <p className="mt-[0.15cm] text-center text-[10px]">Păstrați la rece (0–4 °C) · www.puiimei.ro</p>
      </article>
    </Container>
  );
}

function QrBox({ title, text, svg }: { title: string; text: string; svg: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border-2 border-black p-[0.15cm] text-center">
      <p className="text-base font-black tracking-widest">{title}</p>
      <div className="w-[4.6cm] max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-[11px] leading-tight font-semibold">{text}</p>
    </div>
  );
}
