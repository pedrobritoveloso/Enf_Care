import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

// 1. Configuração da Viewport (ecrã e zoom móvel)
export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Impede zoom acidental em botões no ecrã tátil
};

// 2. Metadados para PWA e iOS (Safari)
export const metadata: Metadata = {
  title: "MyEnfCare — Gestão de Escalas",
  description: "Plataforma de gestão de escalas para enfermagem",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyEnfCare",
  },
  icons: {
    apple: "/icon-192.png", // Ícone que vai aparecer no ecrã inicial do iPhone
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${inter.className} bg-slate-50 min-h-screen text-slate-800 antialiased`}>
        <Providers>
          {/* Container limpo para simular a vista Mobile/Desktop centralizada */}
          <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl flex flex-col">
            <Navbar />
            <main className="flex-1 p-4 pb-12">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}