import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ClientShell } from "@/components/orders/ClientShell";
import { PrintButton } from "@/components/orders/PrintButton";
import { buttonClasses } from "@/components/ui/Button";
import { formatDate, formatLei, formatNumber } from "@/lib/format";
import { GROWTH } from "@/lib/growth";
import { feedAdvance, paymentSplit, pricing } from "@/lib/pricing";
import { site } from "@/lib/site";
import { orderFarm } from "@/server/orders";
import { canViewOrder } from "@/server/order-access";
import { preorderRepository } from "@/server/repositories/preorders";
import { zoneRepository } from "@/server/repositories/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contract de creștere", robots: { index: false, follow: false } };

const blank = "……………………";

function Party({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-2xl bg-cream-100 p-4 text-sm print:bg-white print:p-0">
      <p className="font-semibold text-forest-900">{title}</p>
      <dl className="mt-2 space-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap gap-x-2"><dt className="text-muted">{k}:</dt><dd className="font-medium">{v || blank}</dd></div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Contractul de creștere la comandă, în trei părți: clientul (beneficiar), gospodăria (crescător)
 * și ECORATE S.R.L. (consultant). MODEL: textul se validează cu juristul.
 */
export default async function ContractPage({ params }: PageProps<"/comanda/[token]/contract">) {
  const { token } = await params;
  const order = await preorderRepository.byTrackingToken(token);
  if (!order) notFound();
  if (!(await canViewOrder(order))) redirect(`/comanda?nr=${encodeURIComponent(order.number)}`);
  const [{ lot, farm, payment }, zone] = await Promise.all([orderFarm(order), zoneRepository.byId(order.zoneId, { includeInactive: true })]);
  const adv = order.feedPayment?.amount ?? feedAdvance(order.birds, payment?.feedPricePerKg, payment?.chickPricePerBird).amount;
  const split = paymentSplit(order.estimate.total, adv);
  const c = site.company;


  return (
    <ClientShell number={order.number} token={token}>
    <Container className="max-w-3xl py-10 print:py-0">
      <div className="print:hidden">
        <p role="note" className="mb-6 rounded-2xl border-2 border-[#f5c400] bg-[#fff6c7] p-4 text-sm text-[#3d3200]">
          <strong>Model de contract, în curs de validare juridică.</strong> Datele companiei se completează la înființarea firmei.
          Clauzele finale pot diferi.
        </p>
      </div>

      <article className="space-y-6 text-[15px] leading-relaxed">
        <header className="text-center">
          <h1 className="text-3xl font-semibold">Contract de creștere la comandă</h1>
          <p className="mt-1 text-muted">nr. {order.number} din {formatDate(order.createdAt)}</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <Party title="1. Beneficiarul (clientul)" rows={[["Nume", order.customer.name], ["Telefon", order.customer.phone], ["Email", order.customer.email]]} />
          <Party
            title="2. Crescătorul (gospodăria)"
            rows={[["Gospodăria", farm?.name ?? "se alocă"], ["Titular", payment?.holder || farm?.owner || ""], ["Localitatea", farm ? `${farm.village}, jud. ${farm.county}` : ""], ["Înregistrare sanitar-veterinară", farm?.veterinaryRegistration ?? ""]]}
          />
          <Party title="3. Consultantul" rows={[["Companie", c.legalName], ["CUI", c.cui === "—" ? "" : c.cui], ["Reg. Com.", c.regCom === "—" ? "" : c.regCom], ["Platforma", "Puii mei (puiimei.ro)"]]} />
        </section>

        <section>
          <h2 className="text-xl font-semibold">Art. 1. Obiectul contractului</h2>
          <p className="mt-2">
            Crescătorul crește, la comanda Beneficiarului, <strong>{order.birds} pui</strong>
            {lot ? <> în lotul <strong className="font-mono">{lot.code}</strong></> : " într-un lot care se alocă"}, timp de aproximativ{" "}
            {lot?.growthDays ?? GROWTH.growthDays} de zile: primele {GROWTH.indoorDays} de zile la căldură, în interior, apoi pe pășune, în țarcuri mobile
            de câte {GROWTH.birdsPerPen} de pui, mutate zilnic. La final, puii se sacrifică tradițional în gospodărie și se predau Beneficiarului ca{" "}
            <strong>pui curățați, gata de gătit</strong> (greutate estimată ~{formatNumber(pricing.avgWeightKg)} kg / pui).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Art. 2. Prețul și plata</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Prețul: <strong>{formatLei(order.estimate.pricePerKg)} / kg</strong> de pui curățat. Total estimat: <strong>{formatLei(order.estimate.total)}</strong> (~{formatNumber(order.estimate.estimatedKg)} kg{order.estimate.deliveryFee ? `, inclusiv livrarea de ${formatLei(order.estimate.deliveryFee)}` : ""}).</li>
            <li>Avansul (puii de o zi și furajul lor): <strong>{formatLei(adv)}</strong>, plătit de Beneficiar <strong>direct în contul Crescătorului</strong>{payment?.iban ? ` (IBAN ${payment.iban})` : ""}. Avansul se scade din preț.</li>
            <li>Restul, estimat la <strong>{formatLei(split.atDelivery)}</strong>, se plătește la livrare, după greutatea reală cântărită.</li>
            <li>Consultantul nu încasează prețul și nu vinde produsul; el nu este parte la vânzare.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Art. 3. Obligațiile Crescătorului</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Să crească puii după modelul de creștere de mai sus, cu furaje din cereale, fără promotori de creștere.</li>
            <li>Să noteze în jurnalul platformei fiecare mutare a țarcului și fiecare intervenție, să încarce o poză la cel mult 7 zile și să noteze verificările veterinare.</li>
            <li>Să sacrifice în condiții de igienă, să răcească imediat produsul și să păstreze lanțul de frig până la predare.</li>
            <li>Să emită documentele fiscale pentru sumele încasate.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Art. 4. Obligațiile Beneficiarului</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Să plătească avansul după alocarea pe lot și restul prețului la livrare.</li>
            <li>Să primească produsul la adresa sau punctul ales ({zone?.name ?? order.zoneId}) și să confirme primirea.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Art. 5. Rolul Consultantului</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Pune la dispoziție platforma Puii mei: precomanda, alocarea pe lot, jurnalul de creștere, trasabilitatea și organizarea livrării.</li>
            <li>Oferă Crescătorului consultanță pentru creștere și monitorizează respectarea modelului de creștere; abaterile se semnalează.</li>
            <li>Publică pentru Beneficiar jurnalul, pozele și cifrele lotului, pe pagina comenzii.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Art. 6. Anulare, pierderi și litigii</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Beneficiarul poate anula gratuit precomanda până la confirmare.</li>
            <li>Pierderile de pui în timpul creșterii: {blank} (de stabilit cu juristul).</li>
            <li>Neînțelegerile se rezolvă amiabil; în caz contrar, de instanțele competente. Drepturile consumatorului rămân neafectate (ANPC).</li>
          </ul>
        </section>

        <section className="grid gap-3 text-sm sm:grid-cols-3">
          {["Beneficiarul", "Crescătorul", "Consultantul"].map((s) => (
            <div key={s} className="rounded-2xl border border-dashed border-forest-900/20 p-4">
              <p className="font-semibold">{s}</p>
              <p className="mt-8 text-muted">Semnătura / acceptare electronică</p>
            </div>
          ))}
        </section>
        <p className="text-xs text-muted">Termenii au fost acceptați de Beneficiar la plasarea precomenzii ({formatDate(order.createdAt)}).</p>
      </article>

      <div className="mt-8 flex flex-wrap gap-2 print:hidden">
        <PrintButton className={buttonClasses("primary", "md")} />
        <a href={`/comanda/${token}`} className={buttonClasses("ghost", "md")}>← Înapoi la comandă</a>
      </div>
    </Container>
    </ClientShell>
  );
}
