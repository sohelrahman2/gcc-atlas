import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { DATA_AS_OF, formatDate, getCompanies, getSources } from "@/lib/data";

export const metadata: Metadata = {
  title: {
    default: "GCC Atlas",
    template: "%s | GCC Atlas",
  },
  description:
    "Evidence-backed research for multinationals planning a Global Capability Centre in India: discover existing GCCs, compare cities and check every source.",
};

export const viewport: Viewport = {
  themeColor: "#08182a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const snapshot = {
    asOf: formatDate(DATA_AS_OF),
    companies: getCompanies().length,
    sources: getSources().length,
  };

  return (
    <html lang="en">
      <body>
        <AppShell snapshot={snapshot}>{children}</AppShell>
      </body>
    </html>
  );
}
