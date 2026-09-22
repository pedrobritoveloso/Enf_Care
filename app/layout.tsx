import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyEnfCare — Gestão de Escalas",
  description: "Plataforma de gestão de escalas para enfermagem",
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