import type { Metadata } from "next";
import { ThemeProvider } from "@/contexts/theme-context";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Vercatryx",
  description: "Your business solution platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
