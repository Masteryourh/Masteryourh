# CLAUDE — Matricea de navigare între spații (generată din cod)

**Data:** 2026-11-24 · **Sursa:** `src/lib/nav-policy.ts` (aceeași scanare ca testul automat)
**Regula (SC-049):** din Admin nu se iese în alt spațiu decât explicit (`nav-permis`) sau în tab nou.

## Numărul de legături pe perechi de spații (origine → destinație)
| Pereche | Legături |
|---|---|
| admin → admin | 70 |
| admin → household | 1 |
| admin → public | 4 |
| admin → resource | 3 |
| courier → courier | 4 |
| customer → customer | 16 |
| household → admin | 2 |
| household → household | 15 |
| household → public | 1 |
| household → resource | 1 |
| investor → admin | 1 |
| investor → investor | 2 |
| public → auth | 1 |
| public → public | 14 |
| shared → auth | 6 |
| shared → customer | 16 |
| shared → public | 32 |
| shared → resource | 6 |

`shared` = componente folosite în mai multe spații (destinația depinde de pagina care le folosește; în Admin sunt
verificate la rulare de testul E2E care parcurge paginile Admin).

## Toate trecerile între spații
| Unde (fișier:linie) | Din | Spre | Spațiu destinație | Cum |
|---|---|---|---|---|
| `app/(panou)/admin/gospodarii/[slug]/page.tsx:22` | admin | `/gospodarii/` | public | tab nou ↗ |
| `app/(panou)/admin/gospodarii/page.tsx:64` | admin | `/gospodarii/` | public | tab nou ↗ |
| `app/(panou)/admin/interes/page.tsx:43` | admin | `/in-curand` | public | tab nou ↗ |
| `app/(panou)/admin/layout.tsx:39` | admin | `/cont/gospodar` | household | explicit (nav-permis) |
| `app/(panou)/admin/parteneri/page.tsx:41` | admin | `/devino-partener` | public | tab nou ↗ |
| `app/(panou)/cont/gospodar/layout.tsx:18` | household | `/admin` | admin | explicit (nav-permis) |
| `app/(panou)/cont/gospodar/layout.tsx:26` | household | `/admin` | admin | explicit (nav-permis) |
| `app/(panou)/cont/gospodar/page.tsx:150` | household | `/gospodarii/` | public | tab nou ↗ |
| `app/(panou)/cont/investitor/layout.tsx:11` | investor | `/admin` | admin | explicit (nav-permis) |
| `app/not-found.tsx:16` | shared | `/` | public | componentă comună (depinde de pagină) |
| `app/not-found.tsx:17` | shared | `/trasabilitate` | public | componentă comună (depinde de pagină) |
| `components/farms/FarmCard.tsx:9` | shared | `/gospodarii/` | public | componentă comună (depinde de pagină) |
| `components/forms/ContactForm.tsx:60` | shared | `/confidentialitate` | public | componentă comună (depinde de pagină) |
| `components/forms/InterestForm.tsx:74` | shared | `/confidentialitate` | public | componentă comună (depinde de pagină) |
| `components/forms/InvestorForm.tsx:99` | shared | `/confidentialitate` | public | componentă comună (depinde de pagină) |
| `components/forms/PartnerForm.tsx:113` | shared | `/confidentialitate` | public | componentă comună (depinde de pagină) |
| `components/forms/PreorderForm.tsx:90` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/forms/PreorderForm.tsx:111` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/forms/PreorderForm.tsx:120` | shared | `/comanda` | customer | componentă comună (depinde de pagină) |
| `components/forms/PreorderForm.tsx:301` | shared | `/confidentialitate` | public | tab nou ↗ |
| `components/home/Hero.tsx:63` | shared | `/precomanda` | public | componentă comună (depinde de pagină) |
| `components/home/Story.tsx:106` | shared | `/precomanda` | public | componentă comună (depinde de pagină) |
| `components/home/Story.tsx:109` | shared | `/cum-functioneaza` | public | componentă comună (depinde de pagină) |
| `components/layout/Footer.tsx:18` | shared | `/precomanda` | public | componentă comună (depinde de pagină) |
| `components/layout/Footer.tsx:23` | shared | `/in-curand` | public | componentă comună (depinde de pagină) |
| `components/layout/Footer.tsx:57` | shared | `/comanda` | customer | componentă comună (depinde de pagină) |
| `components/layout/Footer.tsx:67` | shared | `/cifre` | public | componentă comună (depinde de pagină) |
| `components/layout/Footer.tsx:72` | shared | `/legislatie` | public | componentă comună (depinde de pagină) |
| `components/layout/Footer.tsx:77` | shared | `/confidentialitate` | public | componentă comună (depinde de pagină) |
| `components/layout/Header.tsx:56` | shared | `/comanda` | customer | componentă comună (depinde de pagină) |
| `components/layout/Header.tsx:64` | shared | `/comanda` | customer | componentă comună (depinde de pagină) |
| `components/layout/Header.tsx:77` | shared | `/precomanda` | public | componentă comună (depinde de pagină) |
| `components/layout/Logo.tsx:39` | shared | `/` | public | componentă comună (depinde de pagină) |
| `components/layout/MobileNav.tsx:60` | shared | `/precomanda` | public | componentă comună (depinde de pagină) |
| `components/layout/MobileNav.tsx:64` | shared | `/comanda` | customer | componentă comună (depinde de pagină) |
| `components/lots/LotCard.tsx:12` | shared | `/trasabilitate/` | public | componentă comună (depinde de pagină) |
| `components/nav/Breadcrumbs.tsx:15` | shared | `/` | public | componentă comună (depinde de pagină) |
| `components/orders/ClientFrame.tsx:16` | shared | `/` | public | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:10` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:11` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:12` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:13` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:14` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:15` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:16` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:22` | shared | `/comanda/` | customer | componentă comună (depinde de pagină) |
| `components/orders/ClientShell.tsx:32` | shared | `/` | public | componentă comună (depinde de pagină) |
| `components/panel/PanelShell.tsx:43` | shared | `/` | public | tab nou ↗ |
| `components/panel/PanelShell.tsx:86` | shared | `/` | public | tab nou ↗ |
| `components/sections/CtaBand.tsx:21` | shared | `/precomanda` | public | componentă comună (depinde de pagină) |
| `components/sections/CtaBand.tsx:24` | shared | `/cum-functioneaza` | public | componentă comună (depinde de pagină) |
| `lib/site.ts:28` | shared | `/cum-functioneaza` | public | componentă comună (depinde de pagină) |
| `lib/site.ts:29` | shared | `/gospodarii` | public | componentă comună (depinde de pagină) |
| `lib/site.ts:30` | shared | `/trasabilitate` | public | componentă comună (depinde de pagină) |
| `lib/site.ts:31` | shared | `/despre-noi` | public | componentă comună (depinde de pagină) |
| `lib/site.ts:32` | shared | `/devino-partener` | public | componentă comună (depinde de pagină) |
| `server/order-access.ts:180` | shared | `/comanda?nr=` | customer | componentă comună (depinde de pagină) |

## Contextul de întoarcere (Admin)
| De la | La | „Înapoi” duce la |
|---|---|---|
| Admin → Loturi → țarc → comandă | `/admin/comenzi/<nr>` | `/admin/loturi?deschis=<lot>#tarc-<lot>-<n>` (lotul deschis, țarcul în ecran) |
| Admin → listă comenzi → comandă | `/admin/comenzi/<nr>` | `/admin#comanda-<nr>` (rândul comenzii evidențiat) |
| Comandă → contract / etichetă / tură / gospodărie / jurnal | pagina Admin respectivă | comanda |
| Gospodării / fișa gospodăriei / monitorizare → jurnal | `/admin/gospodarii/<slug>/jurnal` | pagina de origine |
| Documente (registre) / fișa gospodăriei → documente | `/admin/gospodarii/<slug>/documente` | pagina de origine |
| Link direct / refresh / tab nou | orice pagină Admin | părintele din traseu (fallback) |
