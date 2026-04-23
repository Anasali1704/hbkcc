import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "../components/app-header";

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
        <AppHeader />
        {children}
      </body>
    </html>
  );
}