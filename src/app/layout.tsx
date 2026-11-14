import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter se autoaloja en el build (next/font): ninguna petición externa en tiempo de ejecución.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Copiloto · exclusivo para clientes BBVA",
  description: "Te avisa antes de que te falte dinero y te propone qué hacer, con su costo en soles.",
  applicationName: "Copiloto",
  appleWebApp: { capable: true, title: "Copiloto", statusBarStyle: "default" },
  icons: { icon: "/icono-192.png", apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-PE" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
