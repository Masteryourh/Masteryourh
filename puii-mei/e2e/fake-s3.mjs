// Server S3 de test (doar pentru teste locale și CI): păstrează obiectele în memorie și VERIFICĂ semnătura AWS SigV4
// a fiecărei cereri (aceeași verificare pe care o face Cloudflare R2 / AWS), cu cheile de test din mediu.
// Pornire: FILES_S3_ACCESS_KEY_ID=... FILES_S3_SECRET_ACCESS_KEY=... node e2e/fake-s3.mjs  (port 9100)
// Rute de inspecție pentru teste (fără autentificare, doar local): GET /__debug/list, PUT /__debug/obj/<cheie>.
import { createServer } from "node:http";
import { AwsV4Signer } from "aws4fetch";

const PORT = Number(process.env.FAKE_S3_PORT ?? 9100);
const ID = process.env.FILES_S3_ACCESS_KEY_ID;
const SECRET = process.env.FILES_S3_SECRET_ACCESS_KEY;
if (!ID || !SECRET) throw new Error("Lipsesc FILES_S3_ACCESS_KEY_ID / FILES_S3_SECRET_ACCESS_KEY");
const objects = new Map(); // "bucket/cheie" → { body, type }

async function signatureOk(req, body) {
  const auth = req.headers.authorization ?? "";
  const m = auth.match(/^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/);
  if (!m || m[1] !== ID) return false;
  const headers = {};
  for (const h of m[4].split(";")) if (h !== "host") headers[h] = req.headers[h];
  const signer = new AwsV4Signer({
    method: req.method,
    url: `http://${req.headers.host}${req.url}`,
    headers,
    body: body.length ? body : undefined,
    accessKeyId: ID,
    secretAccessKey: SECRET,
    service: "s3",
    region: m[3],
    datetime: req.headers["x-amz-date"],
  });
  const { headers: signed } = await signer.sign();
  return signed.get("authorization") === auth;
}

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const path = decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "");
  if (path === "__debug/list") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify([...objects.keys()]));
  }
  if (path.startsWith("__debug/obj/") && req.method === "PUT") {
    objects.set(path.slice("__debug/obj/".length), { body, type: "application/octet-stream" });
    return res.end("ok");
  }
  if (!(await signatureOk(req, body))) {
    res.statusCode = 403;
    return res.end("<Error><Code>SignatureDoesNotMatch</Code></Error>");
  }
  if (req.method === "PUT") {
    objects.set(path, { body, type: req.headers["content-type"] ?? "application/octet-stream" });
    return res.end();
  }
  if (req.method === "GET") {
    const o = objects.get(path);
    if (!o) {
      res.statusCode = 404;
      return res.end("<Error><Code>NoSuchKey</Code></Error>");
    }
    res.setHeader("Content-Type", o.type);
    return res.end(o.body);
  }
  res.statusCode = 405;
  res.end();
}).listen(PORT, "127.0.0.1", () => console.log(`fake-s3 pe http://127.0.0.1:${PORT}`));
