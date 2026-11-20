import { PHOTO_SIDES } from "@/lib/delivery";

/**
 * Comparația fotografiilor: la ridicare (curier) și la primire (client), pe
 * aceleași laturi ale coletului. `clientToken` permite clientului să le vadă.
 */
export function PhotoCompare({
  loadIds,
  clientIds,
  clientToken,
}: {
  loadIds?: string[];
  clientIds?: string[];
  clientToken?: string;
}) {
  const src = (id: string) => `/foto/${id}${clientToken ? `?c=${encodeURIComponent(clientToken)}` : ""}`;
  const rows = PHOTO_SIDES.map((side, i) => ({ side, load: loadIds?.[i], client: clientIds?.[i] }));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-muted">
            <th className="pb-2 pr-3 font-semibold">Latura</th>
            <th className="pb-2 font-semibold">La ridicare</th>
            <th className="pb-2 font-semibold">La primire</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.side}>
              <td className="py-1.5 pr-2 align-top font-medium">{r.side}</td>
              {[r.load, r.client].map((id, j) => (
                <td key={j} className="w-[42%] py-1.5 pr-2">
                  {id ? (
                    <a href={src(id)} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src(id)} alt={`${r.side}, ${j === 0 ? "la ridicare" : "la primire"}`} className="aspect-square w-full rounded-xl object-cover ring-1 ring-forest-900/10" />
                    </a>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-cream-100 text-xs text-muted">—</div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
