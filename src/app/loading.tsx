export default function Loading() {
  return (
    <main className="hbkcc-page" aria-busy="true" aria-live="polite">
      <div className="hbkcc-shell">
        <div className="hbkcc-card animate-pulse p-8">
          <div className="h-8 w-64 rounded bg-stone-200" />
          <div className="mt-4 h-4 w-96 max-w-full rounded bg-stone-200" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-32 rounded-3xl bg-stone-100" />
            ))}
          </div>
          <span className="sr-only">Indlæser undervisningsportalen</span>
        </div>
      </div>
    </main>
  );
}
