import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hbkcc-page">
      <div className="hbkcc-shell">
        <section className="hbkcc-card mx-auto max-w-2xl p-8 text-center">
          <p className="font-semibold text-[var(--brand-red)]">404</p>
          <h1 className="mt-2 text-3xl font-bold">Siden blev ikke fundet</h1>
          <p className="mt-3 text-[var(--text-muted)]">
            Linket er muligvis gammelt, eller siden er blevet flyttet.
          </p>
          <Link href="/" className="hbkcc-primary-btn mt-6 inline-flex">
            Gå til undervisningsportalen
          </Link>
        </section>
      </div>
    </main>
  );
}
