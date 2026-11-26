import { test, expect, type Page } from "@playwright/test";
import writeXlsxFile from "write-excel-file/node";
async function workbook() {
  const rows: unknown[][] = [
    [null, "Conti e carte:", "Esempio sintetico"],
    [null, "I movimenti selezionati sono:", 4],
    [
      "Data",
      "Operazione",
      "Dettagli",
      "Conto o carta",
      "Contabilizzazione",
      "Categoria ",
      "Valuta",
      "Importo",
    ],
    [
      new Date("2025-02-10T00:00:00Z"),
      "Bonifico esempio",
      "Trasferimento da verificare",
      "Conto TEST",
      "CONTABILIZZATO",
      "Bonifici",
      "EUR",
      -100,
    ],
    [
      new Date("2025-02-11T00:00:00Z"),
      "Accredito esempio",
      "Esempio",
      "Conto TEST",
      "CONTABILIZZATO",
      "Entrate",
      "EUR",
      250.45,
    ],
    [
      new Date("2025-02-12T00:00:00Z"),
      "Pagamento in attesa",
      "Esempio",
      "Conto TEST",
      "DA CONTABILIZZARE",
      "Acquisti",
      "EUR",
      -20,
    ],
    [
      new Date("2025-02-11T00:00:00Z"),
      "Pagamento carta",
      "Esempio",
      "Carta TEST",
      "CONTABILIZZATO",
      "Acquisti",
      "EUR",
      -5,
    ],
  ];
  return writeXlsxFile(
    rows.map((r) =>
      r.map((value) =>
        value === null
          ? null
          : value instanceof Date
            ? { value, type: Date, format: "dd/mm/yyyy" }
            : typeof value === "number"
              ? { value, type: Number }
              : { value: String(value), type: String },
      ),
    ),
    { sheet: "Lista Operazione" },
  ).toBuffer();
}
async function open(page: Page) {
  await page.locator(".import-choices>button").nth(1).click();
  await page
    .getByRole("button", { name: "Excel Fideuram", exact: true })
    .click();
}
for (const width of [320, 1440])
  test(`Excel Fideuram: anteprima, conti separati, reimportazione e saldi invariati ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    let privateRequests = 0;
    await page.route(
      /^https:\/\/(identitytoolkit|firestore)\.googleapis\.com\//,
      (r) => {
        privateRequests++;
        return r.abort();
      },
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: "Prova con dati di esempio" })
      .click();
    const nav = page.locator(width < 700 ? ".mobile-nav" : ".desktop-nav");
    await nav.getByRole("button", { name: "Fonti", exact: true }).click();
    const file = {
      name: "esempio-fideuram.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: await workbook(),
    };
    for (let i = 0; i < 2; i++) {
      await open(page);
      await page.locator("input[type=file]").setInputFiles(file);
      await expect(page.getByRole("dialog").getByRole("status")).toContainText(
        "4 righe lette",
      );
      await page
        .getByLabel("Conto o carta nel file")
        .selectOption("Conto TEST");
      await page
        .getByLabel("Voce di destinazione")
        .selectOption({ label: "Conto corrente" });
      await page.getByRole("button", { name: "Verifica anteprima" }).click();
      await expect(page.locator(".import-stats")).toContainText(
        i === 0 ? "2 valide" : "0 valide",
      );
      await expect(page.locator(".preview-scroll")).toContainText(
        "non contabilizzato",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (i === 0)
        await page
          .getByRole("button", { name: "Conferma 2 movimenti" })
          .click();
      else {
        await expect(page.locator(".preview-scroll")).toContainText(
          "già importato",
        );
        await expect(
          page.getByRole("button", { name: "Conferma 0 movimenti" }),
        ).toBeDisabled();
        await page.getByRole("button", { name: "Chiudi", exact: true }).click();
      }
    }
    await nav.getByRole("button", { name: "Panoramica", exact: true }).click();
    await expect(page.locator(".net-amount")).toContainText("112.000,00");
    expect(privateRequests).toBe(0);
  });
test("file Excel non valido non lascia anteprime o importazioni", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Prova con dati di esempio" }).click();
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "Fonti" })
    .click();
  await open(page);
  await page.locator("input[type=file]").setInputFiles({
    name: "corrotto.xlsx",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("non excel"),
  });
  await expect(page.getByRole("alert")).toContainText("Excel non valido");
  await expect(
    page.getByRole("button", { name: "Verifica anteprima" }),
  ).toBeDisabled();
});
