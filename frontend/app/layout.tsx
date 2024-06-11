import type { Metadata } from "next";
import "./globals.css";

import { detectHost } from "./api";

export const metadata: Metadata = {
  title: "Bernabo",
  description: "Descubre el asistente AI de Laboratorios Bernabó, diseñado para revolucionar la interacción en el campo de la salud mediante la aplicación de tecnologías de generación de lenguaje avanzadas y análisis de datos precisos."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="icon.ico" />
      <link rel="icon" href="static/icon.ico" />
      <body>{children}</body>
    </html>
  );
}
