import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/query-provider";

export const metadata: Metadata = {
  title: "BCC HUB DevRel OS",
  description: "Персональный центр управления DevRel-контекстом BCC HUB",
  applicationName: "BCC HUB DevRel OS",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8934F9"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru" data-scroll-behavior="smooth"><body><QueryProvider>{children}</QueryProvider></body></html>;
}
