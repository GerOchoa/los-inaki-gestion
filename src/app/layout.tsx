import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Los Iñaki — Gestión",
  description: "Carga de formularios y tablero gerencial de Los Iñaki",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
