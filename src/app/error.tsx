"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal page failed", error);
  }, [error]);

  return (
    <main className="hbkcc-page">
      <div className="hbkcc-shell">
        <section className="hbkcc-card mx-auto max-w-2xl p-8 text-center">
          <h1 className="text-3xl font-bold">Noget gik galt</h1>
          <p className="mt-3 text-[var(--text-muted)]">
            Siden kunne ikke indlæses. Prøv igen, eller kontakt en administrator,
            hvis problemet fortsætter.
          </p>
          <button onClick={reset} className="hbkcc-primary-btn mt-6">
            Prøv igen
          </button>
        </section>
      </div>
    </main>
  );
}
