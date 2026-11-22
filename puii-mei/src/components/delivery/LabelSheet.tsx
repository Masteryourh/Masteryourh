import QRCode from "qrcode";
import type { Parcel, Preorder } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { LogoMark } from "@/components/layout/Logo";

const qr = (url: string) =>
  QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });

/** O etichetă de colet, 15 × 10 cm: QR „CURIER” + QR „CLIENT”, lot și data limită. */
export async function Label({
  parcel,
  preorder,
  zone,
  origin,
}: {
  parcel: Parcel;
  preorder: Preorder | null;
  zone: string;
  origin: string;
}) {
  const [courierQr, clientQr] = await Promise.all([
    qr(`${origin}/livrare/c/${parcel.courierToken}`),
    qr(`${origin}/confirmare/${parcel.clientToken}`),
  ]);
  return (
    <article className="label-paper mx-auto w-[15cm] max-w-full break-inside-avoid rounded-xl border-2 border-black bg-white p-[0.35cm] text-black print:mb-[0.5cm] print:rounded-none">
      <header className="flex items-center justify-between border-b-2 border-black pb-[0.15cm]">
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-[40px]" />
          <span className="font-display text-lg font-semibold">Puii mei</span>
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-bold">{parcel.preorderNumber}</p>
          <p className="text-[11px]">
            {parcel.birds} pui · lot <strong>{parcel.lotCode}</strong> · v{parcel.version}
          </p>
        </div>
      </header>
      <p className="mt-[0.1cm] truncate text-[12px]">
        <strong>{preorder?.customer.name}</strong> · {zone}
        {preorder?.address ? ` · ${preorder.address}` : ""}
      </p>
      <p className="text-[12px] font-bold">A se consuma până la: {formatDate(parcel.expiresOn)} · Păstrați la 0–4 °C</p>
      <div className="mt-[0.15cm] grid grid-cols-2 gap-[0.3cm]">
        <QrBox title="CURIER" text="Scanează la ridicare și la predare" svg={courierQr} />
        <QrBox title="CLIENT" text="Scanează la primire: verifică și fotografiază coletul" svg={clientQr} />
      </div>
    </article>
  );
}

function QrBox({ title, text, svg }: { title: string; text: string; svg: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border-2 border-black p-[0.1cm] text-center">
      <p className="text-sm font-black tracking-widest">{title}</p>
      <div className="w-[4.3cm] max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-[10px] leading-tight font-semibold">{text}</p>
    </div>
  );
}
