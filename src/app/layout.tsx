import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "../components/layout-wrapper";

export const metadata: Metadata = {
  title: "HBKCC Undervisning",
  description: "Pre Mahaad undervisningsplatform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}