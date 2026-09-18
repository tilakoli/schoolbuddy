import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Lora, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { APP_CONFIG } from "@/constants/config";
import { getServerLanguage } from "@/lib/i18n/server";

const heading = Lora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.tagline,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const language = await getServerLanguage();

  return (
    <html
      lang={language}
      className={`${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
