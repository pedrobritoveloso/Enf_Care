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
    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          // Força a utilização preferencial da câmara traseira
          videoConstraints: {
            facingMode: { exact: "environment" } // Se falhar em alguns dispositivos específicos, podes remover o "exact" e deixar só "environment"
          }
        },
        false
      );

      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          scanner.clear().catch(console.error);
          onScanSuccess(decodedText);
        },
        (error) => {
          // Erros contínuos de varrimento de câmara (ignorados)
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