import type { FarmDocument } from "@/lib/domain";
import { documentCategoryLabels, formatBytes } from "@/lib/documents";
import { formatDate } from "@/lib/format";
import { verifyDocumentAction } from "@/app/(panou)/cont/gospodar/documente-actions";

/**
 * Lista documentelor: tip, titlu, lot, cine și când a încărcat, amprenta SHA-256
 * (dovada că fișierul nu a fost modificat), verificarea adminului.
 */
export function DocumentTable({
  docs,
  farmNames,
  canVerify = false,
  returnTo,
}: {
  docs: FarmDocument[];
  farmNames?: Map<string, string>;
  canVerify?: boolean;
  returnTo?: string;
}) {
  if (!docs.length) return <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">Niciun document încă.</p>;
  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            {["Document", "Tip", ...(farmNames ? ["Gospodăria"] : []), "Lot", "Încărcat", "Verificare", ""].map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {docs.map((d) => (
            <tr key={d.id} className="align-top">
              <td className="px-3 py-2">
                <div className="font-medium">{d.title}</div>
                <div className="text-xs text-slate-500">
                  {d.number ? `nr. ${d.number} · ` : ""}din {formatDate(d.date)} · {d.fileName} ({formatBytes(d.size)})
                </div>
                <div className="font-mono text-[11px] text-slate-400" title={`SHA-256: ${d.sha256}`}>SHA-256 {d.sha256.slice(0, 16)}…</div>
              </td>
              <td className="px-3 py-2">{documentCategoryLabels[d.category]}</td>
              {farmNames && <td className="px-3 py-2">{(d.farmSlug && farmNames.get(d.farmSlug)) || "—"}</td>}
              <td className="px-3 py-2 font-mono text-xs">{d.lotCode ?? "—"}</td>
              <td className="px-3 py-2 text-xs text-slate-600">
                {formatDate(d.uploadedAt)}
                <div>{d.uploadedBy}</div>
              </td>
              <td className="px-3 py-2 text-xs">
                {d.verifiedAt ? (
                  <span className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-900" title={`${d.verifiedBy}, ${formatDate(d.verifiedAt)}`}>
                    Verificat
                  </span>
                ) : canVerify ? (
                  <form action={verifyDocumentAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="inapoi" value={returnTo ?? "/admin/documente"} />
                    <button className="rounded bg-slate-800 px-2 py-0.5 font-semibold text-white">Marchează verificat</button>
                  </form>
                ) : (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">Neverificat</span>
                )}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <a href={`/fisiere/${d.id}?vezi=1`} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline">Deschide</a>{" "}
                <a href={`/fisiere/${d.id}`} className="ml-2 text-slate-600 underline">Descarcă</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
