import type { Metadata } from "next";
import "./globals.css";
import "./improvements.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Между нами",
  description: "Личное пространство пары: календарь, воспоминания, мечты и разговоры.",
  applicationName: "Между нами",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Между нами", statusBarStyle: "black-translucent" },
  icons: { icon: `${basePath}/favicon.svg`, shortcut: `${basePath}/favicon.svg`, apple: `${basePath}/favicon.svg` },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><head><script src={`${basePath}/config.js`} /></head><body className="antialiased">{children}</body></html>;
}
