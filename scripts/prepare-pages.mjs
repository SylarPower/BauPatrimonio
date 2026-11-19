// Build eseguita dal manutentore/agente, non dall'utente finale.
// Pubblica solo l'output statico: mai IndexedDB, backup o .env.
import { execFileSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
const base = process.env.BAU_BASE_PATH || "/BauPatrimonio/";
execFileSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: { ...process.env, BAU_BASE_PATH: base },
});
const list = async (root, prefix = "") =>
  (
    await Promise.all(
      (await readdir(join(root, prefix), { withFileTypes: true })).map(
        async (e) =>
          e.isDirectory()
            ? list(root, join(prefix, e.name))
            : [join(prefix, e.name)],
      ),
    )
  ).flat();
await mkdir("docs", { recursive: true });
let previous = [];
try {
  previous = JSON.parse(await readFile("docs/.pages-files.json", "utf8"));
} catch {}
for (const file of previous) {
  if (
    typeof file !== "string" ||
    file.startsWith("/") ||
    file.split(/[\\/]/).includes("..")
  )
    throw Error("Manifesto artefatti non valido");
  await rm(join("docs", file), { force: true });
}
const files = await list("dist");
for (const file of files) {
  await mkdir(dirname(join("docs", file)), { recursive: true });
  await cp(join("dist", file), join("docs", file), {
    recursive: true,
    force: true,
  });
}
await writeFile("docs/.nojekyll", "");
await writeFile(
  "docs/.pages-files.json",
  JSON.stringify(files, null, 2) + "\n",
);
console.log(
  `Pages pronto: ${files.length} file pubblici in docs/, base ${base}. Nessun workflow richiesto.`,
);
