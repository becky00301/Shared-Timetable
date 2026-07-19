"use client";

import { toPng } from "html-to-image";
import jsPDF from "jspdf";

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

// The timetable lives in a scroll container, so only the visible slice would be
// captured by default. Measure the full scrollable area and expand the cloned
// node to that size so every day column and all 24 hours land in the image.
async function captureFull(element: HTMLElement) {
  const width = Math.max(element.scrollWidth, element.clientWidth);
  const height = Math.max(element.scrollHeight, element.clientHeight);

  const dataUrl = await toPng(element, {
    width,
    height,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    style: {
      width: `${width}px`,
      height: `${height}px`,
      maxHeight: "none",
      overflow: "visible"
    }
  });

  return { dataUrl, width, height };
}

export async function exportTimetablePng(element: HTMLElement, filename: string) {
  element.classList.add("export-mode");
  try {
    const { dataUrl } = await captureFull(element);
    downloadDataUrl(dataUrl, filename);
  } finally {
    element.classList.remove("export-mode");
  }
}

export async function exportTimetablePdf(element: HTMLElement, filename: string) {
  element.classList.add("export-mode");
  try {
    const { dataUrl, width, height } = await captureFull(element);
    const pdf = new jsPDF({
      orientation: width >= height ? "landscape" : "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    // Fit the capture inside the page without distorting it.
    const scale = Math.min((pageWidth - margin * 2) / width, (pageHeight - margin * 2) / height);
    const renderWidth = width * scale;
    const renderHeight = height * scale;

    pdf.addImage(
      dataUrl,
      "PNG",
      (pageWidth - renderWidth) / 2,
      (pageHeight - renderHeight) / 2,
      renderWidth,
      renderHeight
    );
    pdf.save(filename);
  } finally {
    element.classList.remove("export-mode");
  }
}
