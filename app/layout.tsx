import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Figma OAuth Demo",
  description: "Demonstration of Figma OAuth authentication flow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
