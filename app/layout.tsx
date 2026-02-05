import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCP Billing Dashboard",
  description: "Real-time Google Cloud billing dashboard with simulated BigQuery data"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
