import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Instrument_Sans,
  JetBrains_Mono,
} from "next/font/google";
import { Providers } from "@/components/shared/providers";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans-tc",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const themeBoot = `(function(){try{var t=localStorage.getItem('tc-theme')||'dark';if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export const metadata: Metadata = {
  title: "TechConnect Ops",
  description: "Lead CRM and contract payroll for technician workforce ops",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-text antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
