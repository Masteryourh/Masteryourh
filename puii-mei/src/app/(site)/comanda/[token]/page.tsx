import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { buttonClasses } from "@/components/ui/Button";
import { LotStatusBadge } from "@/components/lots/LotStatusBadge";
import { CopyButton } from "@/components/orders/CopyButton";
import { availabilityDate, growthProgress, lotStatus } from "@/lib/lots";
import { formatDate, formatLei, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";
import { tourStatusLabels } from "@/lib/delivery";
import { feedFor, feedStatusOf, orderFarm } from "@/server/orders";
import { preorderRepository } from "@/server/repositories/preorders";
import { zoneRepository } from "@/server/repositories/catalog";
import { parcelRepository, tourRepository } from "@/server/repositories/delivery";
import { cancelOrderAction, declarePaymentAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comanda mea", robots: { index: false, follow: false } };

const time = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

/** Pagina comenzii (link secret, fără cont): plata hranei, lotul, livrarea. */
export default async function OrderPage({ params, searchParams }: PageProps<"/comanda/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const order = await preorderRepository.byTrackingToken(token);
  if (!order) notFound();

  const [{ lot, farm, payment }, zone, parcel] = await Promise.all([
    orderFarm(order),
    zoneRepository.byId(order.zoneId),
    parcelRepository.byId(order.id),
  ]);
  const tour = parcel?.tourId ? await tourRepository.byId(parcel.tourId) : null;
  const feed = feedFor(order, payment);
  const feedStatus = feedStatusOf(order);
  const cancelled = order.status === "anulata";
  const delivered = order.status === "livrata" || Boolean(parcel?.delivered);
  const status = lot ? lotStatus(lot) : null;

  const steps = [
    { label: "Precomandă primită", done: true, note: formatDate(order.createdAt) },
    { label: "Confirmată de Puii mei", done: order.status !== "noua" },
    { label: "Alocată pe lot și gospodărie", done: Boolean(lot), note: lot ? `${lot.code} · ${farm?.name ?? ""}` : undefined },
    {
      label: "Avansul (pui de o zi + furaj)",
      done: feedStatus === "primita",
      note: feedStatus === "declarata" ? "plată anunțată, se verifică" : feedStatus === "primita" ? "primit" : undefined,
    },
    { label: "Puii cresc în gospodărie", done: status === "in-procesare" || status === "disponibil" || status === "livrat" || delivered },
    { label: "Sacrificare și pregătire", done: status === "disponibil" || status === "livrat" || delivered },
    { label: "Livrare", done: delivered, note: tour && !delivered ? tourStatusLabels[tour.status] : undefined },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <>
      <section className="border-b border-forest-900/5 bg-cream-100">
        <Container className="max-w-3xl py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Comanda mea</p>
          <h1 className="mt-2 font-mono text-3xl font-semibold">{order.number}</h1>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Cantitate</dt><dd className="font-semibold">{order.birds} pui (~{formatNumber(order.estimate.estimatedKg)} kg)</dd></div>
            <div><dt className="text-muted">Livrare</dt><dd className="font-semibold">{zone?.name ?? order.zoneId}</dd></div>
            <div><dt className="text-muted">Gospodăria</dt><dd className="font-semibold">{farm ? `${farm.name}, ${farm.village}` : "Se alocă în curând"}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Păstrează linkul acestei pagini.</span>
            <CopyButton value={`${site.url}/comanda/${token}`} label="Copiază linkul" />
          </div>
        </Container>
      </section>

      <Container className="max-w-3xl space-y-8 py-10">
        {cancelled && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-800">
            Comanda a fost anulată. Pentru întrebări, scrie-ne la {site.company.email}.
          </p>
        )}

        {/* Plata hranei */}
        {!cancelled && (
          <section id="plata" className="scroll-mt-28 rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Avansul: puii de o zi + furajul</h2>
                <p className="mt-1 text-sm text-muted">
                  Plătit direct în contul gospodăriei. Nu e un cost în plus: se scade din prețul total, la livrare.
                </p>
              </div>
              <FeedBadge status={feedStatus} />
            </div>

            {typeof sp.eroare === "string" && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">{sp.eroare}</p>}

            {!farm && (
              <p className="mt-5 rounded-2xl bg-cream-100 p-4 text-sm">
                Comanda ta urmează să fie alocată unui lot. Imediat după, aici apar <strong>datele de plată ale gospodăriei</strong>{" "}
                și suma exactă. Te anunțăm și telefonic.
              </p>
            )}
            {farm && !payment && (
              <p className="mt-5 rounded-2xl bg-cream-100 p-4 text-sm">
                Gospodăria {farm.name} își completează datele de plată. Revino pe această pagină în curând; te anunțăm și telefonic.
              </p>
            )}

            {farm && payment && (
              <>
                <p className="mt-6 text-sm text-muted">Suma de plătit</p>
                <p className="font-display text-4xl font-semibold text-forest-900">{formatLei(feed.amount)}</p>
                <dl className="mt-2 max-w-sm space-y-1 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-muted">Pui de o zi: {order.birds} × {formatLei(feed.chickPrice)}</dt><dd className="font-semibold">{formatLei(feed.chickAmount)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Furaj: ~{formatNumber(feed.kg)} kg × {formatLei(feed.pricePerKg)}</dt><dd className="font-semibold">{formatLei(feed.feedAmount)}</dd></div>
                </dl>

                <dl className="mt-6 divide-y divide-forest-900/8 rounded-2xl ring-1 ring-forest-900/10">
                  <PayRow label="Titularul contului" value={payment.holder} />
                  <PayRow label="IBAN" value={<span className="font-mono">{payment.iban.replace(/(.{4})/g, "$1 ").trim()}</span>} copy={payment.iban} />
                  {payment.bank && <PayRow label="Banca" value={payment.bank} />}
                  <PayRow label="Suma" value={formatLei(feed.amount)} copy={feed.amount.toFixed(2)} />
                  <PayRow label="Detalii plată (obligatoriu)" value={<span className="font-mono">Avans {order.number}</span>} copy={`Avans ${order.number}`} />
                </dl>

                {feedStatus === "de-platit" && (
                  <div className="mt-6 rounded-2xl bg-forest-50 p-5">
                    <p className="text-sm">
                      Fă transferul din aplicația băncii tale, cu datele de mai sus. După ce ai plătit, apasă butonul de mai jos.
                      Gospodăria confirmă primirea banilor, iar statusul se actualizează aici.
                    </p>
                    <form action={declarePaymentAction} className="mt-4">
                      <input type="hidden" name="token" value={token} />
                      <button className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>Am făcut plata</button>
                    </form>
                  </div>
                )}
                {feedStatus === "declarata" && (
                  <p className="mt-6 rounded-2xl bg-grain-300/40 p-4 text-sm">
                    {sp.platit ? "Mulțumim! " : ""}Ai anunțat plata pe {time.format(new Date(order.feedPayment!.declaredAt!))}.
                    Gospodăria verifică primirea banilor (de obicei în 1–2 zile lucrătoare, cât durează transferul).
                  </p>
                )}
                {feedStatus === "primita" && (
                  <p className="mt-6 flex items-center gap-2 rounded-2xl bg-forest-50 p-4 text-sm font-semibold text-forest-800">
                    <Icon name="check" className="h-5 w-5" /> Plata a fost primită
                    {order.feedPayment?.confirmedAt ? ` pe ${formatDate(order.feedPayment.confirmedAt)}` : ""}. Mulțumim!
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {/* Etape */}
        <section className="rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:p-8">
          <h2 className="text-2xl font-semibold">Stadiul comenzii</h2>
          <ol className="mt-5 space-y-3">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    s.done ? "bg-forest-700 text-white" : i === current && !cancelled ? "bg-grain-400 text-forest-900" : "bg-cream-200 text-muted",
                  )}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <span>
                  <span className={cn("font-medium", !s.done && i !== current && "text-muted")}>{s.label}</span>
                  {s.note && <span className="block text-sm text-muted">{s.note}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Lotul */}
        {lot && status && (
          <section className="rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-2xl font-semibold">Lotul <span className="font-mono">{lot.code}</span></h2>
              <LotStatusBadge status={status} />
            </div>
            <p className="mt-2 text-muted">
              {farm ? `${farm.name}, ${farm.village}. ` : ""}Disponibil estimat: <strong className="text-forest-900">{formatDate(availabilityDate(lot))}</strong>
            </p>
            {status === "in-crestere" && (
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-forest-50">
                <div className="h-full rounded-full bg-forest-500" style={{ width: `${growthProgress(lot)}%` }} />
              </div>
            )}
            <Link href={`/trasabilitate/${lot.code}`} className={buttonClasses("secondary", "md", "mt-5")}>
              Vezi evoluția lotului, etapă cu etapă
            </Link>
          </section>
        )}

        {order.status === "noua" && feedStatus === "de-platit" && (
          <form action={cancelOrderAction} className="rounded-3xl bg-cream-100 p-6 text-sm">
            <input type="hidden" name="token" value={token} />
            <p className="text-muted">Te-ai răzgândit? Poți anula gratuit precomanda până la confirmare.</p>
            <button className="mt-3 font-semibold text-red-800 underline">Anulează precomanda</button>
          </form>
        )}

        {/* Livrarea */}
        {!cancelled && (
          <section className="rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:p-8">
            <h2 className="text-2xl font-semibold">Livrarea</h2>
            {!parcel && (
              <p className="mt-2 text-muted">
                Se programează după sacrificare{zone?.deliveryDay ? `, de regulă ${zone.deliveryDay.toLowerCase()}` : ""}. Te sunăm înainte cu data
                și intervalul orar.
              </p>
            )}
            {parcel && !delivered && (
              <>
                <p className="mt-2 text-muted">
                  {tour && tour.status !== "anulata"
                    ? `Livrare planificată pe ${formatDate(tour.date)} · ${tourStatusLabels[tour.status]}.`
                    : "Coletul e pregătit. Livrarea se programează în curând."}
                </p>
                <Link href={`/confirmare/${parcel.clientToken}`} className={buttonClasses("primary", "md", "mt-5")}>
                  Urmărește livrarea
                </Link>
              </>
            )}
            {parcel && delivered && (
              <>
                <p className="mt-2 text-muted">Comanda a fost livrată. Confirmă primirea și spune-ne cum a fost.</p>
                <Link href={`/confirmare/${parcel.clientToken}`} className={buttonClasses("primary", "md", "mt-5")}>
                  Confirmarea primirii
                </Link>
              </>
            )}
            <dl className="mt-6 grid gap-2 border-t border-forest-900/8 pt-5 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Preț total estimat</dt><dd className="font-semibold">{formatLei(order.estimate.total)}</dd></div>
              <div><dt className="text-muted">Minus avansul</dt><dd className="font-semibold">− {formatLei(feed.amount)}</dd></div>
              <div><dt className="text-muted">Rest de plată la livrare (estimativ)</dt><dd className="font-semibold">{formatLei(Math.max(0, order.estimate.total - feed.amount))}</dd></div>
              <div><dt className="text-muted">Prețul final</dt><dd className="font-semibold">după greutatea reală, la cântărire</dd></div>
            </dl>
          </section>
        )}
      </Container>
    </>
  );
}

function PayRow({ label, value, copy }: { label: string; value: React.ReactNode; copy?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="break-all font-semibold text-forest-900">{value}</dd>
      </div>
      {copy && <CopyButton value={copy} />}
    </div>
  );
}

function FeedBadge({ status }: { status: "de-platit" | "declarata" | "primita" }) {
  const map = {
    "de-platit": ["De plătit", "bg-grain-300/60 text-forest-900"],
    declarata: ["Se verifică", "bg-cream-200 text-forest-900"],
    primita: ["Plătit", "bg-forest-700 text-white"],
  } as const;
  const [label, cls] = map[status];
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", cls)}>{label}</span>;
}
