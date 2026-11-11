import type { Metadata } from "next";
import type { ReactNode } from "react";
// @ts-ignore Next.js handles this global stylesheet import.
import "./globals.css";

export const metadata: Metadata = {
  title: "ByeByeBrain",
  description: "Keep the knowledge. Pass the project.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
