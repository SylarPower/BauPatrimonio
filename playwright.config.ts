import { defineConfig } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
const prod = process.env.BAU_TEST_PRODUCTION === "1";
const port = prod ? 4173 : 5173;
let launchOptions = {};
if (process.env.BAU_USE_PACKAGED_CHROMIUM === "1") {
  const dir = mkdtempSync(join(tmpdir(), "bau-browser-"));
  const archive = join(dir, "libs.tar");
  writeFileSync(
    archive,
    brotliDecompressSync(
      readFileSync("node_modules/@sparticuz/chromium/bin/al2023.tar.br"),
    ),
  );
  execFileSync("tar", ["xf", archive, "-C", dir]);
  process.env.LD_LIBRARY_PATH =
    join(dir, "lib") + ":" + (process.env.LD_LIBRARY_PATH || "");
  launchOptions = {
    executablePath: await chromium.executablePath(),
    args: chromium.args.filter(
      (a) =>
        ![
          "--single-process",
          "--disable-web-security",
          "--allow-running-insecure-content",
        ].includes(a),
    ),
  };
}
export default defineConfig({
  testDir: "tests/browser",
  use: { baseURL: `http://localhost:${port}`, headless: true, launchOptions },
  webServer: {
    command: prod
      ? "npm run preview -- --port 4173"
      : "npm run dev -- --port 5173",
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
  reporter: "list",
});
