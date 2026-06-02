import "@radix-ui/themes/styles.css";
import "./globals.css";

import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Scoring & Experiments Demo",
  description: "Trigger Inngest runs exercising scoring and experiments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
