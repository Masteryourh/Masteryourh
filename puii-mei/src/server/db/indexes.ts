/**
 * Câmpurile după care se caută direct în baza de date (fără citirea întregii colecții). Pentru fiecare pereche
 * (colecție, câmp) există un index parțial PostgreSQL pe `data->>'câmp'`. O căutare pe un câmp neînregistrat aici
 * e refuzată (`findBy` aruncă eroare): orice câmp nou de căutare primește și index.
 *
 * Funcții pure, testate unitar (indexes.test.ts).
 */
export const INDEXED_FIELDS = {
  preorders: ["number", "trackingToken", "lotCode", "parentNumber"],
  users: ["email", "setupToken", "farmSlug"],
  parcels: ["clientToken", "courierToken", "ratingToken", "farmSlug", "tourId"],
  tours: ["token", "farmSlug"],
  "tour-events": ["tourId"],
  documents: ["farmSlug", "fileId", "investmentId"],
  expenses: ["farmSlug"],
  investments: ["investorId", "farmSlug"],
  "growth-log": ["lotCode", "farmSlug"],
  outbox: ["status"],
} as const satisfies Record<string, readonly string[]>;

/**
 * Câmpuri-listă de obiecte căutate prin conținere (`@>`), cu index GIN parțial. Ex.: codurile vechi ale unei etichete
 * regenerate (o căutare cu un cod inventat nu mai citește toate coletele).
 */
export const CONTAINS_FIELDS = {
  parcels: ["replacedTokens"],
} as const satisfies Record<string, readonly string[]>;

const NAME = /^[a-z][a-z-]{0,40}$/;
const FIELD = /^[A-Za-z][A-Za-z0-9]{0,40}$/;

/** Refuză orice pereche neînregistrată: numele ajung în SQL ca literali, deci doar valori din lista de mai sus. */
export function assertIndexed(collection: string, field: string) {
  const fields = (INDEXED_FIELDS as Record<string, readonly string[]>)[collection];
  if (!NAME.test(collection) || !FIELD.test(field) || !fields?.includes(field)) {
    throw new Error(`Căutare fără index: ${collection}.${field} (adaug-o în src/server/db/indexes.ts)`);
  }
}

export function assertContains(collection: string, field: string) {
  const fields = (CONTAINS_FIELDS as Record<string, readonly string[]>)[collection];
  if (!NAME.test(collection) || !FIELD.test(field) || !fields?.includes(field)) {
    throw new Error(`Căutare prin conținere fără index: ${collection}.${field} (adaug-o în src/server/db/indexes.ts)`);
  }
}

export const indexName = (collection: string, field: string) => `docs_${collection.replace(/-/g, "_")}_${field.toLowerCase()}`;

/** Expresia căutată; trebuie să fie IDENTICĂ în index și în interogare ca PostgreSQL să folosească indexul. */
export const fieldExpr = (field: string) => `(data->>'${field}')`;

export function indexDdl(collection: string, field: string) {
  assertIndexed(collection, field);
  return `CREATE INDEX IF NOT EXISTS ${indexName(collection, field)} ON documents (${fieldExpr(field)}, created_at) WHERE collection = '${collection}'`;
}

export function containsDdl(collection: string, field: string) {
  assertContains(collection, field);
  return `CREATE INDEX IF NOT EXISTS ${indexName(collection, field)} ON documents USING gin ((data->'${field}') jsonb_path_ops) WHERE collection = '${collection}'`;
}

export const allIndexDdl = () => [
  ...Object.entries(INDEXED_FIELDS).flatMap(([c, fields]) => (fields as readonly string[]).map((f) => indexDdl(c, f))),
  ...Object.entries(CONTAINS_FIELDS).flatMap(([c, fields]) => (fields as readonly string[]).map((f) => containsDdl(c, f))),
];
