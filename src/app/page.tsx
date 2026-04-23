import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hbkcc-page">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="hbkcc-card grid gap-10 p-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-red)]">
              HBKCC Undervisning
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Pre Mahaad undervisningsplatform
            </h1>

            <p className="mb-8 max-w-2xl text-lg text-[var(--text-muted)]">
              En samlet platform til lektionsplan, fravær, materialer, filer og
              undervisningslinks for HBKCC.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="hbkcc-primary-btn">
                Gå til login
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 font-semibold text-[var(--text-primary)]"
              >
                Åbn dashboard
              </Link>
            </div>
          </div>

          <div className="relative mx-auto h-[180px] w-full max-w-[520px]">
            <Image
              src="/logos/hbkcc-full.png"
              alt="HBKCC logo"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 520px"
              priority
            />
          </div>
        </div>
      </div>
    </main>
  );
}