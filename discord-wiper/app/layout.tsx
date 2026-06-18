import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discord Message Wiper",
  description:
    "Delete your own Discord messages from a specific server or channel. Runs in your browser; your token is never stored.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
