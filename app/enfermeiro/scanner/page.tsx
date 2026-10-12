"use client";

import { useState } from "react";
import QrScanner from "@/components/Scanner";
import { useRouter } from "next/navigation";

export default function ScannerPage() {
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const router = useRouter();

  const handleScanSuccess = async (decodedText: string) => {
    setLoading(true);
    setMensagem("A processar leitura do QR Code...");

    try {
      const res = await fetch("/api/enfermeiro/assiduidade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: decodedText }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensagem(data.message);
        setTimeout(() => {
          router.push("/enfermeiro/turnos"); // Redireciona para a lista de turnos
        }, 2000);
      } else {
        setMensagem(data.error || "Erro ao validar QR Code.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setMensagem("Erro de ligação ao servidor.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto py-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900">Registo de Assiduidade</h1>
        <p className="text-xs text-slate-400">Aponte a câmara para o cartaz QR Code da instituição</p>
      </div>

      {loading ? (
        <div className="bg-white p-10 rounded-3xl text-center space-y-3 shadow-sm border border-slate-100">
          <p className="text-sm font-semibold text-blue-600 animate-pulse">{mensagem}</p>
        </div>
      ) : (
        <QrScanner onScanSuccess={handleScanSuccess} />
      )}

      {mensagem && !loading && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center text-xs text-blue-700 font-medium">
          {mensagem}
        </div>
      )}
    </div>
  );
}