"use client";

import { toPng } from "html-to-image";
import jsPDF from "jspdf";

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function exportTimetablePng(element: HTMLElement, filename: string) {
  element.classList.add("export-mode");
  try {
    const dataUrl = await toPng(element, {
      width: 1080,
      height: 1350,
      pixelRatio: 2,
      backgroundColor: "#0F0F0F",
      style: {
        transform: "scale(1)",
        transformOrigin: "top left"
      }
    });
    downloadDataUrl(dataUrl, filename);
  } finally {
    element.classList.remove("export-mode");
  }
}

export async function exportTimetablePdf(element: HTMLElement, filename: string) {
  element.classList.add("export-mode");
  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#0F0F0F"
    });
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.addImage(dataUrl, "PNG", 8, 8, 281, 194);
    pdf.save(filename);
  } finally {
    element.classList.remove("export-mode");
  }
}
