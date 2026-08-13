"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import LogoutButton from "./logout-button";

const navItems = [
  { href: "/dashboard", label: "Lektionsplan" },
  { href: "/attendance", label: "Fravær" }
];

export default function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const offerSlug = searchParams.get("tilbud");

  const getOfferHref = (href: string) =>
    offerSlug ? `${href}?tilbud=${encodeURIComponent(offerSlug)}` : href;

  if (pathname === "/login" || pathname.startsWith("/login")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#d8cfc4] bg-[#f6f3ef]">
      <div className="mx-auto max-w-[1500px] px-6 py-3">
        <div className="flex items-center justify-between gap-6 rounded-[20px] border border-[#8f1d22]/20 bg-[#8f1d22] px-6 py-6 shadow-[0_10px_24px_rgba(143,29,34,0.18)]">
          <Link href="/dashboard" className="flex items-center gap-4">
            <div className="relative h-11 w-13 overflow-hidden rounded-full bg-white/12 ring-1 ring-white/25">
              <Image
                src="/logos/hbkcc-mark.png"
                alt="HBKCC logo"
                fill
                className="object-contain"
                sizes="64px"
                priority
              />
            </div>

            <div>
              <div className="text-[18px] font-semibold tracking-tight text-white">
                HBKCC – Undervisningsportal
              </div>
              <div className="text-sm text-white/85">Pre Mahaad</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-3 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={getOfferHref(item.href)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white text-[#8f1d22] shadow-sm"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/tilbud"
              className="rounded-full px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Skift tilbud
            </Link>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">Aktivt tilbud</div>
              <div className="text-sm text-white/80">Pre Mahaad</div>
            </div>
            <LogoutButton />
          </div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto md:hidden" aria-label="Mobilnavigation">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={getOfferHref(item.href)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                  active
                    ? "bg-[#8f1d22] text-white"
                    : "border border-stone-200 bg-white text-stone-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/tilbud"
            className="whitespace-nowrap rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700"
          >
            Skift tilbud
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
