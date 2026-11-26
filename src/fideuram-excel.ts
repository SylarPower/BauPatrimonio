import { unzipSync } from "fflate";
import { parseFideuram } from "./fideuram";
export async function readFideuramExcel(bytes: ArrayBuffer) {
  if (bytes.byteLength > 2000000) throw Error("Il limite è 2 MB per file.");
  let expanded = 0,
    count = 0;
  try {
    unzipSync(new Uint8Array(bytes), {
      filter: (file) => {
        expanded += file.originalSize;
        count++;
        if (expanded > 12000000 || count > 200)
          throw Error("Archivio Excel troppo grande una volta aperto.");
        return false;
      },
    });
  } catch {
    throw Error(
      "Excel non valido o troppo grande: usa un file .xlsx non protetto.",
    );
  }
  const { default: read } = await import("read-excel-file/browser");
  const sheets = await read(bytes, { parseNumber: (value) => value });
  return parseFideuram(sheets);
}
