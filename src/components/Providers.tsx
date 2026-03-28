"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { NavigationTransition } from "@/components/NavigationTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <NavigationTransition />
      {children}
    </LanguageProvider>
  );
}
