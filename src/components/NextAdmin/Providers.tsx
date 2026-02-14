"use client";

import { SidebarProvider } from "@/components/NextAdmin/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";

export function NextAdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <SidebarProvider>{children}</SidebarProvider>
    </ThemeProvider>
  );
}
