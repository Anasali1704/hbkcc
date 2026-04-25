"use client";

import { usePathname } from "next/navigation";
import AppHeader from "./app-header";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideHeader = pathname === "/" || pathname === "/login";

  return (
    <>
      {!hideHeader && <AppHeader />}
      {children}
    </>
  );
}