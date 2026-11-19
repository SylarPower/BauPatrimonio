import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const assets = (await readdir("dist/assets"))
  .filter((p) => !p.endsWith(".map"))
  .map((p) => "/assets/" + p);
const base = process.env.BAU_BASE_PATH || "/";
if (!/^\/(?:[a-zA-Z0-9_.-]+\/)*$/.test(base))
  throw Error("BAU_BASE_PATH non valido");
const staticPaths = [
  "/index.html",
  "/GUIDA.html",
  "/examples/saldi.csv",
  "/examples/posizioni.csv",
  "/examples/movimenti.csv",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
  ...assets,
];
const version = createHash("sha256")
  .update(
    base +
      JSON.stringify(
        await Promise.all(
          staticPaths.map(async (p) => [
            p,
            (await readFile("dist" + p)).toString("base64"),
          ]),
        ),
      ),
  )
  .digest("hex")
  .slice(0, 12);
const sw = (await readFile("public/sw.js", "utf8"))
  .replace(/const CACHE = .*?;/, `const CACHE = NAMESPACE+"-${version}";`)
  .replace(
    /const PRECACHE = .*?;/s,
    `const PRECACHE = ${JSON.stringify(staticPaths.map((p) => base + p.slice(1)))};`,
  );
await writeFile("dist/sw.js", sw);
console.log(
  `Service worker: ${staticPaths.length} file statici, versione ${version}. Nessuna risposta finanziaria nella cache.`,
);
