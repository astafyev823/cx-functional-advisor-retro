import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CX Transformation · 7-month reflection",
  description: "A one-day leadership session to take stock at the 7-month mark.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
