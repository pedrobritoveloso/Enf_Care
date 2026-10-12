export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import PrintButton from '@/components/PrintButton'; // <--- Importa o componente cliente

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ImprimirQrCodePage({ params }: PageProps) {
  const { id } = await params;

  const instituicao = await prisma.instituicao.findUnique({
    where: { id },
  });

  if (!instituicao || !instituicao.qrCode) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 print:bg-white print:p-0">
      {/* Botões de Ação (ocultos na impressão) */}
      <div className="mb-6 flex items-center gap-4 print:hidden">
        <Link
          href="/admin/instituicoes"
          className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 transition"
        >
          ← Voltar à Lista
        </Link>
        
        {/* Botão interativo isolado num Client Component */}
        <PrintButton />
      </div>

      {/* Cartaz para Impressão */}
      <div className="bg-white w-full max-w-xl p-10 rounded-3xl shadow-xl border border-slate-200 text-center space-y-8 print:shadow-none print:border-none print:p-0">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            MyEnfCare — Registo de Assiduidade
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 pt-2">
            {instituicao.nome}
          </h1>
          <p className="text-sm text-slate-500">{instituicao.morada}</p>
        </div>

        {/* QR Code Grande Central */}
        <div className="flex justify-center py-6">
          <div className="p-6 bg-white border-4 border-slate-900 rounded-3xl shadow-inner inline-block">
            <QRCodeSVG value={instituicao.qrCode} size={240} level="H" />
          </div>
        </div>

        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 print:bg-transparent">
          <p className="text-xs font-medium text-slate-600">
            Aproxime o telemóvel para efetuar o <strong>Check-in</strong> ou <strong>Check-out</strong> do turno.
          </p>
          <p className="text-[10px] font-mono text-slate-400">
            ID Token: {instituicao.qrCode}
          </p>
        </div>
      </div>
    </div>
  );
}