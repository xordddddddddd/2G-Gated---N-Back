import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discord Wiper",
  description:
    "Delete your own Discord messages from specific servers, in your browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
