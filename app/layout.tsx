import type { Metadata } from "next";
import "./globals.css";
import { BusinessProvider } from "./context/BusinessContext";
import AppShell from "./components/AppShell";

export const metadata: Metadata = {
  title: "Rimay",
  description:
    "Configura tu agente de atención al cliente en lenguaje de negocio, sin código.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <BusinessProvider>
          <AppShell>{children}</AppShell>
        </BusinessProvider>
      </body>
    </html>
  );
}
