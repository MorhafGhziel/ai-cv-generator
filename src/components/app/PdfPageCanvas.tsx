"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders one PDF page to a canvas as the editor's background.
 *
 * This is what makes "keep my design" real: everything the page contains —
 * rules, colour blocks, logos, the original typefaces — is drawn exactly as the
 * author made it. Only the text layer is overlaid with editable boxes on top.
 *
 * Rendering happens in the browser rather than on the server because
 * server-side rasterising needs a native canvas build, which is a poor fit for
 * a serverless deploy. pdf.js does it here with no extra runtime.
 */
export default function PdfPageCanvas({
  pdfBytes,
  pageNumber,
  scale,
  onSize,
}: {
  pdfBytes: Uint8Array | null;
  pageNumber: number;
  scale: number;
  onSize?: (size: { width: number; height: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBytes) return;
    let cancelled = false;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // The worker is bundled beside the library; pointing at it via URL lets
        // the bundler emit it rather than requiring a CDN at runtime.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        // pdf.js takes ownership of the buffer, so each render gets a copy.
        const doc = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise;
        if (cancelled) return;

        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        // Render at device resolution so text stays crisp when zoomed.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext("2d");
        if (!context) return;
        context.scale(dpr, dpr);

        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (!cancelled) onSize?.({ width: viewport.width, height: viewport.height });
      } catch (err) {
        if (!cancelled) {
          console.error("[pdf-canvas]", err);
          setError("This page couldn't be displayed.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes, pageNumber, scale, onSize]);

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-[8px] border border-line bg-sunk text-[13px] text-ink-muted">
        {error}
      </div>
    );
  }

  return <canvas ref={canvasRef} className="block rounded-[4px] bg-white shadow-[var(--shadow-lift)]" />;
}
