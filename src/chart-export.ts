import { download } from "./storage";
export async function exportChart(
  svg: SVGSVGElement,
  title: string,
  format: "svg" | "png",
) {
  const style = getComputedStyle(document.documentElement);
  const serializer = new XMLSerializer();
  let body = Array.from(svg.childNodes)
    .map((node) => serializer.serializeToString(node))
    .join("");
  for (const token of [
    "accent",
    "border",
    "muted",
    "text",
    "card",
    "paper",
    "positive",
    "negative",
    "secondary",
  ])
    body = body.replaceAll(
      `var(--${token})`,
      style.getPropertyValue("--" + token).trim(),
    );
  const vb = svg.viewBox.baseVal,
    w = vb.width || 640,
    h = vb.height || 280;
  const escape = (s: string) =>
    s.replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${(h + 80) * 2}" viewBox="0 0 ${w} ${h + 80}" font-family="sans-serif"><rect width="100%" height="100%" fill="${style.getPropertyValue("--card").trim()}"/><text x="20" y="27" fill="${style.getPropertyValue("--text").trim()}" font-size="15">${escape(title)}</text><svg y="45" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg><text x="20" y="${h + 68}" fill="${style.getPropertyValue("--muted").trim()}" font-size="10">BauPatrimonio · EUR · Valori di tua competenza · Non è un rendimento</text></svg>`;
  if (format === "svg") {
    download("baupatrimonio-grafico.svg", xml, "image/svg+xml");
    return;
  }
  const url = URL.createObjectURL(
    new Blob([xml], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = w * 2;
          canvas.height = (h + 80) * 2;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw Error("Esportazione PNG non disponibile");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(Error("PNG non generato"));
              return;
            }
            const u = URL.createObjectURL(blob),
              a = document.createElement("a");
            a.href = u;
            a.download = "baupatrimonio-grafico.png";
            a.click();
            setTimeout(() => URL.revokeObjectURL(u), 1000);
            resolve();
          }, "image/png");
        } catch (e) {
          reject(e);
        }
      };
      image.onerror = () => reject(Error("Impossibile generare il PNG"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
