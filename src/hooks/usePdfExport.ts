import { useCallback } from "react";

type ExportOpts = {
  filename: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter";
};

/**
 * Clone a node into a fully isolated print iframe (white background,
 * no app CSS overlays, no dark dialog backdrops) and trigger print.
 * Returns the iframe so callers can also render it to a canvas.
 */
function buildPrintIframe(node: HTMLElement): Promise<HTMLIFrameElement> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "820px";
    iframe.style.height = "1160px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-1";
    document.body.appendChild(iframe);

    // Copy current page stylesheets so Tailwind classes still apply
    const styleNodes = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((n) => n.outerHTML)
      .join("\n");

    const clone = node.cloneNode(true) as HTMLElement;
    const html = `<!doctype html><html><head><meta charset="utf-8">
<base href="${document.baseURI}">
${styleNodes}
<style>
  html, body { background: #ffffff !important; color: #0f172a !important; margin:0; padding:0; }
  body { font-family: Georgia, 'Times New Roman', serif; }
  [data-print="hide"] { display: none !important; }
  @page { size: A4; margin: 12mm; }
  @media print {
    html, body { background: #ffffff !important; }
    .branded-doc { box-shadow: none !important; }
  }
  /* Defensive: kill any dark mode tokens that may have copied across */
  :root, .dark { color-scheme: light !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style>
</head><body><div id="print-root"></div></body></html>`;

    iframe.srcdoc = html;

    iframe.onload = () => {
      const doc = iframe.contentDocument!;
      const root = doc.getElementById("print-root")!;
      root.appendChild(doc.adoptNode(clone));
      // Defense-in-depth: strip elements explicitly marked no-print, and any
      // stray "powered by / AltRix - Lovable" badge that may have copied across.
      root
        .querySelectorAll<HTMLElement>('[data-print="hide"], .no-print, [data-powered-by]')
        .forEach((el) => el.remove());
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      const toRemove: HTMLElement[] = [];
      let n = walker.nextNode();
      while (n) {
        const txt = (n.nodeValue || "").toLowerCase();
        if (txt.includes("powered by") || txt.includes("altrix - lovable") || txt.includes("altrix: powered by")) {
          if (n.parentElement) toRemove.push(n.parentElement);
        }
        n = walker.nextNode();
      }
      toRemove.forEach((el) => el.remove());
      // Give images a moment to decode
      const imgs = Array.from(root.querySelectorAll("img"));
      Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((res) => {
              if ((img as HTMLImageElement).complete) return res();
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            }),
        ),
      ).then(() => resolve(iframe));
    };
  });
}

/**
 * Renders a DOM node to a downloadable PDF using html2canvas-pro + jspdf.
 * Clones the node into an isolated iframe first so dialog backdrops,
 * dark themes, and parent CSS cannot bleed into the output.
 */
export function usePdfExport() {
  const exportNodeToPdf = useCallback(async (node: HTMLElement, opts: ExportOpts) => {
    const iframe = await buildPrintIframe(node);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const target = iframe.contentDocument!.getElementById("print-root")!
        .firstElementChild as HTMLElement;

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: opts.orientation || "portrait",
        unit: "mm",
        format: opts.format || "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      } else {
        let remaining = imgHeight;
        let y = 0;
        while (remaining > 0) {
          pdf.addImage(imgData, "JPEG", 0, y, imgWidth, imgHeight);
          remaining -= pageHeight;
          if (remaining > 0) {
            pdf.addPage();
            y -= pageHeight;
          }
        }
      }

      pdf.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`);
    } finally {
      iframe.remove();
    }
  }, []);

  /**
   * Print a node by cloning it into an isolated white iframe and calling
   * the iframe's print(). This avoids the "blacked-out page" bug caused by
   * dialog overlays / dark theme bleeding through the print stylesheet.
   */
  const printNode = useCallback(async (node: HTMLElement | null) => {
    if (!node) return;
    const iframe = await buildPrintIframe(node);
    const win = iframe.contentWindow!;
    win.focus();
    win.print();
    // Remove shortly after; browsers keep the print job alive independently.
    setTimeout(() => iframe.remove(), 1000);
  }, []);

  return { exportNodeToPdf, printNode };
}
