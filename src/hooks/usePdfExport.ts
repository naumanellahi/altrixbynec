import { useCallback } from "react";

type ExportOpts = {
  filename: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter";
};

/**
 * Renders a DOM node to a downloadable PDF using html2canvas-pro + jspdf.
 * The node should already render as the final document (letterhead, etc.).
 */
export function usePdfExport() {
  const exportNodeToPdf = useCallback(async (node: HTMLElement, opts: ExportOpts) => {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.96);
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
      // Multi-page: paint full image and shift y per page.
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
  }, []);

  const printNode = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    // Rely on each document's @media print rules; trigger native dialog.
    window.print();
  }, []);

  return { exportNodeToPdf, printNode };
}
