// HU-39 (AC4): exportar el gráfico como PNG sin sumar una librería de
// captura de DOM (html2canvas, dom-to-image) — no hay ninguna en el
// proyecto. El gráfico ya es un <svg>, así que alcanza con serializarlo,
// dibujarlo en un <canvas> y bajar ese canvas como PNG.
export function exportarSvgComoPng(
  svg: SVGSVGElement,
  nombreArchivo: string,
  anchoPx = 1200,
  altoPx = 640,
): void {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(anchoPx));
  clone.setAttribute("height", String(altoPx));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const svgTexto = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgTexto], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = anchoPx;
    canvas.height = altoPx;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, anchoPx, altoPx);
      ctx.drawImage(img, 0, 0, anchoPx, altoPx);
    }
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const descargaUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = descargaUrl;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(descargaUrl);
    }, "image/png");
  };
  img.src = url;
}
