"use client";

import { Theme } from "@radix-ui/themes";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";

function RadixWithAppearance({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <Theme appearance={resolvedTheme === "dark" ? "dark" : "light"} accentColor="indigo" radius="large">
      {children}
    </Theme>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem>
      <RadixWithAppearance>{children}</RadixWithAppearance>
    </NextThemes>
  );
}
