/**
 * Simularea demonstrativă cerută de fondator (28.11.2026): 2 comune, 12 gospodării (10 populate + 2 disponibile),
 * 3.000 de pui comandați (300 / lot), loturi de 60 de zile (+14 zile refacere), 20 de conturi cu parola „0000”.
 *
 *   SIMULARE_DATABASE_URL=postgres://… node scripts/demo/simulare.mjs --plan    # doar citește și arată ce ar face
 *   SIMULARE_DATABASE_URL=postgres://… node scripts/demo/simulare.mjs --apply   # șterge comenzile și populează
 *   SIMULARE_DATABASE_URL=postgres://… node scripts/demo/simulare.mjs --purge   # LA LANSARE: șterge „rădăcina temp”
 *
 * „Rădăcina temp” (cerința fondatorului, 28.11.2026): fiecare înregistrare creată de simulare poartă `_temp` = TEMP.
 * Ea servește drept model pentru construcția bazei și popularea cu date reale. La lansare, `--purge` șterge tot ce
 * ține de simulare — înregistrările marcate și tot ce s-a adăugat peste ele în timpul testelor (comenzi, jurnal,
 * documente, fotografii, ture, conturi ale gospodăriilor / loturilor / clienților temporari) — plus mesajele, limitele
 * și instantaneele (outbox, rate-limits, digest-log, read-models), ca baza să pornească curată.
 *
 * Ce șterge (--apply): comenzile și tot ce ține de ele (registrele de locuri, loturile, coletele, turele, jurnalul de
 * creștere, fotografiile, mesajele din outbox, limitele de PIN, rezumatele), documentele / cheltuielile gospodăriilor
 * și fișierele lor. NU atinge: utilizatorii existenți, auditul (append-only), investițiile, prețurile, zonele.
 * Gospodăriile demonstrative din cod (src/data/farms.ts) și cele create anterior din panou se ascund (reversibil).
 * Fișierele demonstrative vin din docs/demo-acte (PDF / JPG fictive). Faceți întâi o copie (pg_dump).
 */
import pg from "pg";
import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.SIMULARE_DATABASE_URL;
const mode = process.argv.includes("--purge") ? "purge" : process.argv.includes("--apply") ? "apply" : "plan";
/** Marcajul „rădăcinii temp”: toate înregistrările simulării îl poartă, ca să poată fi șterse la lansare. */
const TEMP = "simulare-2026-11";
if (!url) throw new Error("Setează SIMULARE_DATABASE_URL.");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NOW = new Date();
const DAY = 86_400_000;
const iso = (d) => d.toISOString();
const ymd = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(d);
const plus = (days, base = NOW) => new Date(base.getTime() + days * DAY);
const r2 = (n) => Math.round(n * 100) / 100;
const r1 = (n) => Math.round(n * 10) / 10;

// Parametrii aplicației (src/lib/pricing.ts, src/lib/growth.ts).
const AVG_KG = 4.8;
const PRICE_PER_KG = 36; // 30 × 1,2
const FEED_KG_PER_BIRD = 9.8;
const FEED_PRICE = 3.5;
const CHICK_PRICE = 7;
const BIRDS_PER_PEN = 40;
const GROWTH_DAYS = 60;
const LOT_BIRDS = 300;

// Determinism: aceleași nume / cantități la fiecare rulare (doar id-urile și token-urile sunt aleatorii).
let seed = 20261128;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const hashPassword = (pw) => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(pw, salt, 64).toString("base64url")}`;
};
const token = () => randomBytes(24).toString("base64url");

/** IBAN românesc fictiv cu cifra de control corectă (bancă „BTRL”). */
function iban(n) {
  const bban = `BTRLRONCRT${String(n).padStart(14, "0")}`;
  const conv = (s) => s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of conv(`${bban}RO00`)) rem = (rem * 10 + Number(ch)) % 97;
  return `RO${String(98 - rem).padStart(2, "0")}${bban}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Structura: 2 comune, 12 gospodării, 20 de conturi.
// ---------------------------------------------------------------------------------------------------------------
const COMMUNES = [
  { name: "Vama", village: "Vama", zone: "campulung-moldovenesc", lat: 47.566, lng: 25.687 },
  { name: "Fundu Moldovei", village: "Fundu Moldovei", zone: "campulung-moldovenesc", lat: 47.533, lng: 25.4 },
];
// [utilizator, prenume, nume de familie, comuna, startul lotului față de azi (zile) sau null = disponibilă]
const FARMERS = [
  ["vasile", "Vasile", "Popa", "Vama", -52],
  ["maria", "Maria", "Ciobanu", "Vama", -38],
  ["gheorghe", "Gheorghe", "Rusu", "Vama", -24],
  ["ioana", "Ioana", "Lupu", "Vama", 10],
  ["dumitru", "Dumitru", "Munteanu", "Vama", null],
  ["ana", "Ana", "Moraru", "Vama", null],
  ["constantin", "Constantin", "Ursu", "Fundu Moldovei", -58],
  ["florin", "Florin", "Bejan", "Fundu Moldovei", -45],
  ["gabriela", "Gabriela", "Țăran", "Fundu Moldovei", -31],
  ["nicolae", "Nicolae", "Hojda", "Fundu Moldovei", -17],
  ["petru", "Petru", "Cozma", "Fundu Moldovei", -6],
  ["rodica", "Rodica", "Dragomir", "Fundu Moldovei", 20],
];
const MANAGERS = [
  ["mihai", "Mihai", "manager-zonal", ["Vama", "Fundu Moldovei"], "Manager zonal"],
  ["andrei", "Andrei", "manager-local", ["Vama"], "Manager local"],
  ["elena", "Elena", "manager-local", ["Fundu Moldovei"], "Manager local"],
];
const CLIENTS = [
  ["ionut", "Ionuț"],
  ["alina", "Alina"],
  ["cristi", "Cristi"],
  ["daniela", "Daniela"],
  ["sorin", "Sorin"],
];
const FIRST = ["Andreea", "Bogdan", "Carmen", "Dan", "Emil", "Felicia", "George", "Irina", "Laura", "Marius", "Oana", "Paul", "Raluca", "Sergiu", "Teodora", "Victor", "Adrian", "Corina", "Doina", "Lucian", "Mirela", "Radu", "Simona", "Tudor"];
const LAST = ["Popescu", "Ionescu", "Pavel", "Stan", "Tănase", "Nistor", "Grigore", "Ene", "Matei", "Olaru", "Sandu", "Vlad", "Avram", "Chiriac", "Lazăr", "Moldovan"];
const STREETS = ["Str. Bucovinei", "Str. Mihai Eminescu", "Str. Ștefan cel Mare", "Str. Zorilor", "Str. Morii", "Str. Pădurii", "Calea Transilvaniei", "Str. Izvorului"];
const SIZES = [8, 12, 20, 10, 16, 24, 6, 30, 12, 20, 14, 8, 18, 10, 22];

const DEMO = join(ROOT, "docs", "demo-acte");
const DEMO_FILES = {
  proprietate: ["01-act-proprietate-teren.pdf", "Act de proprietate teren", "proprietate"],
  comodat: ["02-contract-comodat-teren.pdf", "Contract de comodat teren", "proprietate"],
  dsv: ["03-certificat-dsv.pdf", "Certificat de înregistrare sanitar-veterinară (DSV)", "dsv"],
  pui: ["04-factura-pui-de-o-zi.pdf", "Factură pui de o zi", "factura"],
  furaje: ["05-factura-furaje.pdf", "Factură furaje (cereale)", "factura"],
  veterinar: ["06-factura-veterinar.pdf", "Factură servicii veterinare", "factura"],
  rumegus: ["07-factura-rumegus.pdf", "Factură rumeguș (așternut)", "factura"],
  energie: ["08-bon-energie.pdf", "Bon fiscal energie", "factura"],
  avans: ["13-chitanta-avans.pdf", "Chitanță avansuri clienți", "contabil"],
  consultanta: ["16-contract-consultanta-gospodar-ecorate.pdf", "Contract de consultanță ECORATE", "contract"],
  vizita: ["21-fisa-vizita-veterinara.pdf", "Fișă vizită veterinară", "altele"],
  pozaPui: ["22-poza-saptamanii-pui.jpg", null, null],
  pozaTarc: ["23-poza-tarc-pe-pasune.jpg", null, null],
};
const mimeOf = (f) => (f.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

// ---------------------------------------------------------------------------------------------------------------
// Executorul: pg direct (local) sau interfața HTTPS a Neon (SIMULARE_NEON_HTTP=1, când nu există TCP spre bază).
// Citirile se fac imediat; scrierile se adună și se trimit la final, în tranzacții (pg: una; Neon: pachete atomice).
const HTTP = process.env.SIMULARE_NEON_HTTP === "1";
let pgc = null;
if (!HTTP) {
  pgc = new pg.Client({ connectionString: url });
  await pgc.connect();
}
async function neon(body) {
  const res = await fetch(`https://${new URL(url).hostname}/sql`, {
    method: "POST",
    headers: { "Neon-Connection-String": url, "Content-Type": "application/json", ...(body.queries ? { "Neon-Batch-Isolation-Level": "Serializable" } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Neon ${res.status}: ${json.message ?? "eroare"}`);
  return json;
}
const q = async (sql, params = []) => (HTTP ? { rows: (await neon({ query: sql, params })).rows } : pgc.query(sql, params));
const queue = [];
const write = (sql, params = []) => {
  queue.push({ query: sql, params });
};
/** Trimite scrierile adunate; întoarce numărul de rânduri afectate pentru fiecare. */
async function flush() {
  const out = [];
  if (!HTTP) {
    await pgc.query("begin");
    try {
      for (const st of queue) out.push((await pgc.query(st.query, st.params)).rowCount);
      await pgc.query("commit");
    } catch (err) {
      await pgc.query("rollback");
      throw err;
    }
    return out;
  }
  let batch = [];
  let size = 0;
  const send = async () => {
    if (!batch.length) return;
    const json = await neon({ queries: batch });
    for (const r of json.results) out.push(r.rowCount);
    console.log(`  pachet trimis: ${batch.length} instrucțiuni`);
    batch = [];
    size = 0;
  };
  for (const st of queue) {
    const n = JSON.stringify(st).length;
    if (batch.length && (size + n > 3_000_000 || batch.length >= 400)) await send();
    batch.push(st);
    size += n;
  }
  await send();
  return out;
}
const end = () => pgc?.end();
/** Listă ca tablou PostgreSQL text (merge identic prin pg și prin HTTPS). */
const arr = (xs) => `{${xs.map((x) => `"${String(x).replace(/["\\]/g, "\\$&")}"`).join(",")}}`;
const count = async (c) => Number((await q("select count(*) from documents where collection = $1", [c])).rows[0].count);

const DELETE = ["preorders", "lot-seats", "lots", "parcels", "tours", "tour-events", "growth-log", "photos", "outbox", "digest-log", "read-models", "rate-limits", "expenses"];
const plan = {};
for (const c of [...DELETE, "documents", "files", "farms", "farm-overrides", "users", "investments", "farm-payments"]) plan[c] = await count(c);
const storedFarms = (await q("select data from documents where collection = 'farms'")).rows.map((r) => `${r.data.slug} (${r.data.name})`);
const existingUsernames = (await q("select data->>'username' u, data->>'email' e from documents where collection = 'users' and (data->>'username' = any($1::text[]) or data->>'email' like '%@demo.puiimei.ro')", [arr([...FARMERS.map((f) => f[0]), ...MANAGERS.map((m) => m[0]), ...CLIENTS.map((c) => c[0])])])).rows;
const investmentFiles = (await q("select count(*) from documents where collection = 'documents' and data->>'investmentId' is not null")).rows[0].count;

console.log(`Mod: ${mode}. Baza: ${new URL(url).host}. Azi (RO): ${ymd(NOW)}.`);
console.log("Înregistrări existente:", plan);
console.log("Gospodării create anterior din panou (vor fi ascunse):", storedFarms.length ? storedFarms : "niciuna");
console.log("Conturi demo existente (@demo.puiimei.ro / aceleași nume de utilizator):", existingUsernames.length);
console.log("Documente ale investițiilor (păstrate):", investmentFiles);
const tempCount = Number((await q("select count(*) from documents where data->>'_temp' = $1", [TEMP])).rows[0].count);
console.log(`Înregistrări în rădăcina temp (${TEMP}):`, tempCount);
if (mode === "purge") {
  try {
    const col = async (c) => (await q("select id from documents where collection = $1 and data->>'_temp' = $2", [c, TEMP])).rows.map((r) => r.id);
    const slugs = await col("farms");
    const codes = await col("lots");
    const users = await col("users");
    const labels = [];
    const del = (label, sql, params) => {
      labels.push(label);
      write(`delete from documents where ${sql}`, params);
    };
    // Tot ce s-a adăugat peste simulare în timpul testelor, legat de gospodăriile / loturile / conturile temporare.
    del("legate de gospodării", "data->>'farmSlug' = any($1::text[])", [arr(slugs)]);
    del("legate de loturi", "data->>'lotCode' = any($1::text[])", [arr(codes)]);
    del("comenzile clienților temporari", "collection = 'preorders' and data->>'customerUserId' = any($1::text[])", [arr(users)]);
    del("fotografii ale loturilor", "collection = 'photos' and data->>'owner' = any($1::text[])", [arr(codes.map((c) => `lot:${c}`))]);
    del("înregistrări per gospodărie / lot", "collection in ('farm-payments', 'farm-land', 'farm-governance', 'lot-seats') and id = any($1::text[])", [arr([...slugs, ...codes])]);
    del("rădăcina temp", "data->>'_temp' = $1", [TEMP]);
    del("fișiere demo fără document", "collection = 'files' and id like 'demo-%' and id not in (select data->>'fileId' from documents where collection = 'documents' and data->>'fileId' is not null)");
    del("mesaje, limite, instantanee", "collection in ('outbox', 'rate-limits', 'digest-log', 'read-models')");
    const counts = await flush();
    const removed = {};
    labels.forEach((l, i) => (removed[l] = (removed[l] ?? 0) + counts[i]));
    console.log("--purge: șters", removed);
  } catch (err) {
    console.error("EROARE la curățare:", err);
    process.exitCode = 1;
  }
  await end();
  process.exit();
}
if (mode === "plan") {
  console.log("\n--plan: nimic modificat. Rulează cu --apply după copia de siguranță.");
  await end();
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------------------------
// --apply: totul într-o singură tranzacție (ori tot, ori nimic).
// ---------------------------------------------------------------------------------------------------------------
const put = (collection, id, data, createdAt = NOW) =>
  write("insert into documents (collection, id, data, created_at) values ($1, $2, $3, $4) on conflict (collection, id) do update set data = excluded.data", [
    collection,
    id,
    // Ascunderea gospodăriilor vechi nu e „temp”: rămâne și după lansare.
    JSON.stringify(collection === "farm-overrides" ? data : { ...data, _temp: TEMP }),
    createdAt,
  ]);

try {
  // 1. Ștergerea comenzilor și a datelor legate de ele.
  const farmDocFiles = (await q("select data->>'fileId' f from documents where collection = 'documents' and data->>'investmentId' is null")).rows.map((r) => r.f);
  const stillUsed = new Set((await q("select data->>'fileId' f from documents where collection = 'documents' and data->>'investmentId' is not null")).rows.map((r) => r.f));
  const orphanFiles = farmDocFiles.filter((f) => f && !stillUsed.has(f));
  for (const c of DELETE) write("delete from documents where collection = $1", [c]);
  write("delete from documents where collection = 'documents' and data->>'investmentId' is null");
  if (orphanFiles.length) write("delete from documents where collection = 'files' and id = any($1::text[])", [arr(orphanFiles)]);
  // O simulare anterioară (reluare): întreaga rădăcină temp.
  write("delete from documents where data->>'_temp' = $1", [TEMP]);

  // 2. Gospodăriile vechi: ascunse (reversibil din Admin › Gospodării).
  const staticFarms = ["gospodaria-hreniuc", "gospodaria-ciornei", "gospodaria-bodnar", "gospodaria-cojocaru", "gospodaria-ungureanu"];
  for (const slug of staticFarms) {
    const cur = (await q("select data from documents where collection = 'farm-overrides' and id = $1", [slug])).rows[0]?.data ?? { id: slug };
    await put("farm-overrides", slug, { ...cur, id: slug, active: false, updatedAt: iso(NOW) });
  }
  write("update documents set data = jsonb_set(data, '{active}', 'false') where collection = 'farms'");

  // 3. Fișierele demonstrative (o singură copie per fișier; documentele le referă).
  const files = {};
  for (const [key, [name]] of Object.entries(DEMO_FILES)) {
    const buf = readFileSync(join(DEMO, name));
    const id = `demo-${name.replace(/\.[a-z]+$/, "")}`;
    const rec = { id, name, mime: mimeOf(name), size: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), data: buf.toString("base64"), uploadedAt: iso(NOW), uploadedBy: "Simulare demo" };
    files[key] = rec;
    if (!key.startsWith("poza")) await put("files", id, rec);
  }

  const pw = hashPassword("0000");
  const access = [];
  const user = async (username, name, role, extra = {}) => {
    const u = { id: randomUUID(), email: `${username}@demo.puiimei.ro`, username, name, phone: `07${String(40 + access.length).padStart(2, "0")} ${String(100 + access.length * 7).slice(-3)} ${String(200 + access.length * 13).slice(-3)}`, role, status: "activ", sessionVersion: 1, passwordHash: pw, demo: true, createdAt: iso(plus(-90)), ...extra };
    await put("users", u.id, u, plus(-90));
    access.push({ role, name, username, password: "0000", ...extra });
    return u;
  };

  for (const [username, first, role, communes, label] of MANAGERS) await user(username, `${label} ${first}`, role, { communes });

  // 4. Gospodăriile, conturile gospodarilor, datele de plată, terenul, documentele.
  const farms = [];
  let n = 0;
  for (const [username, first, last, commune, startOffset] of FARMERS) {
    n++;
    const c = COMMUNES.find((x) => x.name === commune);
    const slug = `gospodaria-${last.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}-${c.village.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "-")}`;
    const owner = `${first} ${last}`;
    const farm = {
      id: slug, slug, name: `Gospodăria ${last}`, owner, village: c.village, county: "Suceava", commune,
      coordinates: { lat: r2(c.lat + (rnd() - 0.5) * 0.04), lng: r2(c.lng + (rnd() - 0.5) * 0.06) },
      since: 2026, capacityPerLot: LOT_BIRDS,
      shortDescription: `Pui crescuți pe pășune, în țarcuri mobile, la ${owner} din ${c.village}.`,
      description: `${owner} crește pui de carne în gospodăria din ${c.village}, comuna ${commune}: 40 de pui pe țarc, țarcurile mutate zilnic pe pășune după vârsta de 21 de zile, hrană din cereale. Gospodărie din simularea demonstrativă.`,
      practices: ["Pășunat în țarcuri mobile", "Hrană din cereale", "Fără antibiotice preventive", "Refacerea pășunii 14 zile între loturi"],
      photos: [{ src: "/images/poveste/4-crestere.webp", alt: `Pui pe pășunea Gospodăriei ${last}` }, { src: "/images/panou/gospodarie-aerian.webp", alt: `Gospodăria ${last} văzută de sus` }],
      veterinaryRegistration: `RO-SV-${String(4100 + n)}`,
      active: true, createdAt: iso(plus(-90)),
    };
    await put("farms", slug, farm, plus(-90));
    const u = await user(username, `Gospodar ${first}`, "gospodar", { farmSlug: slug });
    const by = u.name;
    farms.push({ farm, user: u, startOffset, commune });

    await put("farm-payments", slug, { id: slug, holder: owner, iban: iban(4100 + n), bank: "Banca Transilvania", feedPricePerKg: FEED_PRICE, chickPricePerBird: CHICK_PRICE, updatedAt: iso(plus(-80)), updatedBy: by });

    const doc = async (key, extra = {}) => {
      const [, title, category] = DEMO_FILES[key];
      const f = files[key];
      const d = { id: randomUUID(), farmSlug: slug, category, title, date: ymd(plus(-80)), fileId: f.id, fileName: f.name, mime: f.mime, size: f.size, sha256: f.sha256, uploadedAt: iso(plus(-80)), uploadedBy: by, ...extra };
      await put("documents", d.id, d, new Date(d.uploadedAt));
      return d;
    };
    const land = await doc(n % 3 === 0 ? "comodat" : "proprietate", { number: `CF-${30000 + n}`, verifiedAt: iso(plus(-75)), verifiedBy: "Administrator" });
    // DSV: valabil un an; la o gospodărie expiră în 5 zile (alerta din „De făcut azi”).
    await doc("dsv", { number: `DSV-SV-${500 + n}`, expiresOn: ymd(plus(username === "maria" ? 5 : 300)), verifiedAt: iso(plus(-75)), verifiedBy: "Administrator" });
    await doc("consultanta", { number: `EC-${2026}-${String(n).padStart(3, "0")}`, date: ymd(plus(-85)) });
    await put("farm-land", slug, { id: slug, declaredM2: 1600, proofDocumentId: land.id, declaredAt: iso(plus(-80)), declaredBy: by, verifiedM2: 1600, verifiedAt: iso(plus(-75)), verifiedBy: "Administrator" });
  }

  // 5. Clienții cu cont.
  const clients = [];
  for (const [username, first] of CLIENTS) clients.push(await user(username, `Client ${first}`, "client"));

  // 6. Loturile, precomenzile (simularea fluxului: precomandă → confirmare → alocare → avans → pornire → creștere).
  const populated = farms.filter((f) => f.startOffset !== null);
  const totals = { birds: 0, orders: 0 };
  const lotOrders = {};
  for (const [li, f] of populated.entries()) {
    const { farm, user: farmer, startOffset } = f;
    const start = plus(startOffset);
    const startDate = ymd(start);
    // Codul lotului ca în aplicație (src/lib/lots.ts): inițialele localității (un cuvânt: primele două litere) – anul – nr.
    const words = farm.village.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().split(/[^A-Z]+/).filter(Boolean);
    const prefix = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
    const code = `${prefix}-${startDate.slice(0, 4)}-${String(li + 1).padStart(2, "0")}`;
    const started = startOffset <= 0;
    const pens = Math.ceil(LOT_BIRDS / BIRDS_PER_PEN);
    const lot = {
      id: code, code, farmSlug: farm.slug, species: "pui", breed: "Pui de carne cu creștere lentă (Hubbard JA57)", startDate, growthDays: GROWTH_DAYS, totalBirds: LOT_BIRDS, reservedBirds: 0,
      feed: "Porumb, grâu și șrot de soia (fără antibiotice preventive)", processor: "Abator autorizat DSV, Câmpulung Moldovenesc", pens,
      notes: "Lot din simularea demonstrativă. După sacrificare: 14 zile de refacere a pășunii și igienizare.",
      approval: { status: "aprobat", by: "Administrator", at: iso(plus(startOffset - 40)) },
      createdAt: iso(plus(startOffset - 45)), createdBy: farmer.name,
      ...(started ? { penStarts: Array.from({ length: pens }, (_, i) => ({ n: i + 1, date: ymd(plus(Math.floor(i / 2), start)), at: iso(plus(Math.floor(i / 2), start)), by: farmer.name })) } : {}),
    };
    await put("lots", code, lot, new Date(lot.createdAt));

    // Precomenzile lotului: exact 300 de pui; 2 comenzi pe client cu cont, răspândite pe loturi.
    const ledger = { id: code, capacity: LOT_BIRDS, allocations: {}, reservedAt: {}, updatedAt: iso(NOW) };
    let left = LOT_BIRDS;
    let k = li;
    // Fiecare client cu cont are câte o comandă pe două loturi diferite (loturile 2i și 2i+1).
    let ownPending = clients[Math.floor(li / 2)] ?? null;
    while (left > 0) {
      const own = ownPending;
      ownPending = null;
      let birds = Math.min(left, own ? 20 : SIZES[k++ % SIZES.length]);
      if (left - birds > 0 && left - birds < 4) birds = left; // fără resturi sub minimul de comandă
      left -= birds;
      const created = plus(-(5 + Math.floor(rnd() * 25)), plus(startOffset - 5));
      const zone = pick([["campulung-moldovenesc", 15], ["gura-humorului", 20], ["vatra-dornei", 20]]);
      const kg = r1(birds * AVG_KG);
      const productValue = r2(kg * PRICE_PER_KG);
      const name = own ? own.name.replace(/^Client /, "") + " (client cu cont)" : `${pick(FIRST)} ${pick(LAST)}`;
      const advance = r2(birds * FEED_KG_PER_BIRD * FEED_PRICE + birds * CHICK_PRICE);
      const paid = started || rnd() < 0.5;
      const p = {
        id: randomUUID(),
        number: `PM${String(created.getFullYear()).slice(2)}${String(created.getMonth() + 1).padStart(2, "0")}-${randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase()}`,
        createdAt: iso(created),
        status: started ? "alocata-lot" : "confirmata",
        customer: { name, phone: own ? own.phone : `07${String(20 + Math.floor(rnd() * 79))} ${String(Math.floor(rnd() * 900) + 100)} ${String(Math.floor(rnd() * 900) + 100)}`, email: own ? own.email : "" },
        birds, lotCode: code, zoneId: zone[0],
        address: `${pick(STREETS)} nr. ${1 + Math.floor(rnd() * 120)}, ${pick(["Câmpulung Moldovenesc", "Vama", "Gura Humorului", "Vatra Dornei", "Pojorâta"])}`,
        notes: "", marketingConsent: rnd() < 0.4,
        estimate: { birds, avgWeightKg: AVG_KG, pricePerKg: PRICE_PER_KG, estimatedKg: kg, productValue, deliveryFee: zone[1], total: r2(productValue + zone[1]) },
        trackingToken: token(),
        feedPayment: paid
          ? { status: started || rnd() < 0.6 ? "primita" : "declarata", amount: advance, declaredAt: iso(plus(2, created)), ...(started ? { confirmedAt: iso(plus(3, created)), confirmedBy: farmer.name } : {}) }
          : { status: "de-platit" },
        allocation: { status: "alocata", at: iso(plus(1, created)) },
        ...(own ? { customerUserId: own.id } : {}),
      };
      if (p.feedPayment.status === "primita" && !p.feedPayment.confirmedAt) Object.assign(p.feedPayment, { confirmedAt: iso(plus(3, created)), confirmedBy: farmer.name });
      await put("preorders", p.id, p, created);
      (lotOrders[code] ??= []).push(p);
      ledger.allocations[p.id] = birds;
      ledger.reservedAt[p.id] = p.createdAt;
      totals.birds += birds;
      totals.orders++;
    }
    await put("lot-seats", code, ledger);
    f.lot = lot;
  }

  // 7. Cheltuielile (cu documentul fiscal), venitul din avansuri, jurnalul de creștere și fotografiile.
  for (const { farm, user: farmer, lot, startOffset } of populated) {
    const by = farmer.name;
    const slug = farm.slug;
    const day = -startOffset; // ziua lotului azi
    const doc = async (key, date, number, lotCode) => {
      const [, title, category] = DEMO_FILES[key];
      const fl = files[key];
      const d = { id: randomUUID(), farmSlug: slug, lotCode, category, title, number, date, fileId: fl.id, fileName: fl.name, mime: fl.mime, size: fl.size, sha256: fl.sha256, uploadedAt: iso(new Date(`${date}T10:00:00Z`)), uploadedBy: by };
      await put("documents", d.id, d, new Date(d.uploadedAt));
      return d;
    };
    const expense = async (key, category, supplier, description, amount, date, kind = "cheltuiala") => {
      const number = `${key.slice(0, 3).toUpperCase()}-${Math.floor(1000 + rnd() * 8999)}`;
      const d = await doc(key, date, number, lot.code);
      const e = { id: randomUUID(), kind, invoiceNumber: number, farmSlug: slug, lotCode: lot.code, date, category, supplier, description, amount: r2(amount), documentId: d.id, createdAt: iso(new Date(`${date}T11:00:00Z`)), createdBy: by, confirmedAt: iso(new Date(`${date}T12:00:00Z`)), confirmedBy: by };
      await put("expenses", e.id, e, new Date(e.createdAt));
    };
    const orders = lotOrders[lot.code] ?? [];
    const received = orders.filter((o) => o.feedPayment?.status === "primita").reduce((s, o) => s + o.feedPayment.amount, 0);
    if (received > 0) await expense("avans", "avans-hrana", "Clienți (avansuri)", "Avansuri primite: pui de o zi + furaj", received, ymd(plus(Math.min(-1, startOffset - 2))), "venit");
    if (day < 0) continue; // lotul încă nu a pornit: doar comenzi și avansuri
    await expense("pui", "pui", "Ferma de reproducție Bucovina SRL", `${LOT_BIRDS} pui de o zi`, LOT_BIRDS * CHICK_PRICE, lot.startDate);
    await expense("rumegus", "asternut", "Rumeguș Moldova SRL", "Rumeguș pentru așternut", 380, lot.startDate);
    const feedKgSoFar = Math.round(LOT_BIRDS * FEED_KG_PER_BIRD * Math.min(1, (day + 7) / GROWTH_DAYS));
    await expense("furaje", "furaj", "Agrocereal Câmpulung SRL", `${feedKgSoFar} kg furaj din cereale`, feedKgSoFar * FEED_PRICE, ymd(plus(2, new Date(`${lot.startDate}T12:00:00Z`))));
    await expense("energie", "energie", "E.ON Energie România", "Energie electrică (încălzire pui de o zi)", 140, ymd(plus(Math.min(day, 10), new Date(`${lot.startDate}T12:00:00Z`))));
    if (day >= 14) {
      await expense("veterinar", "sanatate", "Cabinet veterinar Dr. Rotariu", "Vizită veterinară + vaccinare", 320, ymd(plus(14, new Date(`${lot.startDate}T12:00:00Z`))));
      await doc("vizita", ymd(plus(14, new Date(`${lot.startDate}T12:00:00Z`))), `FV-${lot.code}`, lot.code);
    }

    // Fotografiile lotului (o copie per lot, legată de lot pentru drepturile de vizualizare).
    const photo = async (key) => {
      const fl = files[key];
      const id = randomUUID();
      await put("photos", id, { id, mime: fl.mime, data: fl.data, size: fl.size, sha256: fl.sha256, at: iso(NOW), owner: `lot:${lot.code}` });
      return id;
    };
    const pozaPui = await photo("pozaPui");
    const pozaTarc = day >= 21 ? await photo("pozaTarc") : null;

    // Jurnalul: hrănire + apă zilnic; pierderi ocazionale; poza la 7 zile; mutarea țarcurilor zilnic după ziua 21.
    // „Azi” lipsește intenționat la câteva gospodării (apare în „De făcut azi”).
    const skipToday = ["florin", "gheorghe", "petru"].includes(farmer.username);
    const entries = [];
    const add = (d, type, note, extra = {}) => {
      const date = ymd(plus(d, new Date(`${lot.startDate}T12:00:00Z`)));
      entries.push({ id: randomUUID(), lotCode: lot.code, farmSlug: slug, type, date, at: `${date}T${type === "hranire" ? "07:30" : type === "apa" ? "08:00" : "17:00"}:00.000Z`, note, by, ...extra });
    };
    for (let d = 0; d <= day; d++) {
      if (d === day && skipToday) break;
      add(d, "hranire", d < 21 ? "Hrană de start, în adăpost" : "Hrană din cereale, pe pășune");
      add(d, "apa", "Apă proaspătă, adăpători curățate");
      if (rnd() < 0.08) add(d, "mortalitate", "Pui găsit mort dimineața, îndepărtat și notat", { count: 1 });
      if (d > 0 && d % 7 === 0) add(d, "poza", `Poza săptămânii ${d / 7}`, { photoId: d >= 21 && pozaTarc ? pozaTarc : pozaPui });
      if (d === 14) add(d, "veterinar", "Control veterinar: stare bună, vaccinare efectuată", { vetName: "Dr. Ion Rotariu" });
      if (d >= 21) {
        const lastPen = farmer.username === "constantin" && d >= day - 1 ? 7 : lot.pens; // țarcul 8 nemutat (alertă)
        for (let pen = 1; pen <= lastPen; pen++) add(d, "mutare", `Țarcul ${pen} mutat pe pășune nouă`, { pen, lat: r2(farm.coordinates.lat + pen * 0.0002), lng: r2(farm.coordinates.lng + d * 0.0001) });
      }
      if (d === 21) add(d, "curatenie", "Adăpostul de start curățat și dezinfectat după ieșirea pe pășune");
    }
    for (const e of entries) await put("growth-log", e.id, e, new Date(e.at));
  }

  console.log(`Scrieri de trimis: ${queue.length}`);
  await flush();
  console.log(`\nGata: ${farms.length} gospodării (${populated.length} cu lot), ${totals.orders} precomenzi, ${totals.birds} pui, ${access.length} conturi.`);
  console.log("\nLISTA DE ACCES (parola pentru toate: 0000)");
  for (const a of access) console.log(`${a.role.padEnd(14)} ${a.name.padEnd(28)} utilizator: ${a.username.padEnd(11)} ${a.farmSlug ? `gospodăria: ${a.farmSlug}` : a.communes ? `comune: ${a.communes.join(", ")}` : ""}`);
} catch (err) {
  console.error("EROARE:", err);
  process.exitCode = 1;
} finally {
  await end();
}
