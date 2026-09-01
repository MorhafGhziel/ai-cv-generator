"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { UploadSpot } from "@/components/art/Spots";
import { Spinner } from "@/components/ui/Icons";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * PDF drop target. Accepts a drop or a click, and rejects the obvious cases
 * (wrong type, oversized) before spending a network round trip and a slice of
 * the daily quota on them.
 */
export default function PdfDropzone({
  onFile,
  uploading,
  status,
}: {
  onFile: (file: File) => void;
  uploading: boolean;
  status?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(file: File | undefined) {
    setError(null);
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("That's not a PDF. Export your CV as a PDF and try again.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is over 10MB. Try exporting it at a smaller size.");
      return;
    }
    onFile(file);
  }

  if (uploading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[20px] border border-line bg-sunk/50 px-6 py-16 text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <UploadSpot size={92} />
        </motion.div>
        <p className="mt-5 flex items-center gap-2 text-[14px] font-medium text-ink">
          <Spinner className="text-[16px] text-flame" />
          Reading your CV…
        </p>
        <p className="mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-ink-muted">
          {status ?? "Pulling out your roles, skills and dates. This takes a few seconds."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center rounded-[20px] border-2 border-dashed px-6 py-12 text-center transition-[border-color,background-color,transform] duration-250 ${
            dragging
              ? "scale-[1.01] border-flame bg-flame-soft"
              : "border-line-strong bg-sunk/40 hover:border-ink hover:bg-sunk"
          }`}
        >
          <motion.div animate={dragging ? { y: -6, scale: 1.06 } : { y: 0, scale: 1 }}>
            <UploadSpot size={92} />
          </motion.div>
          <p className="mt-5 text-[15px] font-semibold text-ink">
            {dragging ? "Drop it here" : "Drop your CV, or click to browse"}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-muted">PDF, up to 10MB</p>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            accept(e.target.files?.[0]);
            // Clearing lets the same file be picked again after an error.
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-[13px] text-danger"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
