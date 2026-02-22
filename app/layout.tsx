import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reds In",
  description: "A party game of prediction and deception",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#0a0a0a] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
