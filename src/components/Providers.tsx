"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

/**
 * A single Toaster lives here rather than being repeated per page, so toast
 * styling can never drift between screens.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-center"
        gutter={10}
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--color-ink)",
            color: "#fff",
            fontSize: "13.5px",
            fontWeight: 500,
            borderRadius: "12px",
            padding: "11px 15px",
            maxWidth: "440px",
            boxShadow: "var(--shadow-pop)",
          },
          success: {
            iconTheme: { primary: "var(--color-mint)", secondary: "var(--color-ink)" },
          },
          error: {
            duration: 6000,
            iconTheme: { primary: "var(--color-flame)", secondary: "var(--color-ink)" },
          },
        }}
      />
    </SessionProvider>
  );
}
