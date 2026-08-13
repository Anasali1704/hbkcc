import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hbkcc-page">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="hbkcc-card grid gap-10 p-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand-red)]">
              HBKCC
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              HBKCC – Undervisningsportal
            </h1>

            <p className="mb-8 max-w-2xl text-lg text-[var(--text-muted)]">
              Én samlet indgang til HBKCC&apos;s undervisningstilbud, lektionsplaner,
              materialer og fravær.
            </p>

            <Link href="/login" className="hbkcc-primary-btn inline-flex">
              Log ind på undervisningsportalen
            </Link>
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
