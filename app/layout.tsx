import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campagne de dons — Téléopérateur",
  description: "Appel + lien unique de suivi des clics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
