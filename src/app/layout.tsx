import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { APP_NAME } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: `${APP_NAME} // OSINT Command Center`,
  description: "Real-time geopolitical intelligence monitoring dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
