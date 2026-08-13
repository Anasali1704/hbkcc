"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import AppHeader from "./app-header";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideHeader = pathname === "/" || pathname === "/login" || pathname === "/tilbud";

  return (
    <>
      {!hideHeader && (
        <Suspense fallback={null}>
          <AppHeader />
        </Suspense>
      )}
      {children}
    </>
  );
}
