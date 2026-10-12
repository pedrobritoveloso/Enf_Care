"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export default function QrScanner({ onScanSuccess }: QrScannerProps) {
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Evitar iniciar duas vezes no StrictMode
    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        false
      );

      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          // Quando lê com sucesso, limpa o scanner e passa o texto (token do QR)
          scanner.clear().catch(console.error);
          onScanSuccess(decodedText);
        },
        (error) => {
          // Erros de leitura contínuos da câmara (normal enquanto procura o código)
          // Ignoramos para não poluir a consola, ou guardamos se necessário
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error("Erro ao limpar scanner:", err));
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="w-full max-w-md mx-auto bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
      <div id="reader" className="overflow-hidden rounded-2xl"></div>
      {scanError && <p className="text-xs text-red-500 mt-2 text-center">{scanError}</p>}
    </div>
  );
}