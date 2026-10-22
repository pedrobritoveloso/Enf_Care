"use client";

import { useState } from "react";
import { Clock, MapPin, CheckCircle2, Navigation, AlertTriangle, X, Info, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";

interface Turno {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  estado: "ATRIBUIDO" | "EM_CURSO" | "CONCLUIDO" | "CANCELADO" | string;
  motivoConclusao?: string | null;
  instituicao: { nome: string; morada: string };
  assiduidades?: Array<{
    entradaReal?: string;
    saidaReal?: string;
  }>;
}

export function ProximoTurnoCard({ turno, onUpdate }: { turno: Turno; onUpdate?: () => void }) {
  const [modalAberto, setModalAberto] = useState(false);
  const router = useRouter();

  const assiduidade = turno.assiduidades?.[0];

  const checarSeTurnoExpirou = () => {
    try {
      const [horas, minutos] = turno.horaFim.split(":").map(Number);
      const dataFim = new Date(turno.data);
      dataFim.setHours(horas, minutos, 0, 0);
      return new Date() > dataFim;
    } catch {
      return false;
    }
  };

  const turnoExpirado = checarSeTurnoExpirou();
  const isConcluido = turno.estado === "CONCLUIDO" || turnoExpirado;
  const isCancelado = turno.estado === "CANCELADO";

  const irParaScanner = () => {
    setModalAberto(false);
    router.push("/enfermeiro/scanner");
  };

  return (
    <>
      <div
        onClick={() => setModalAberto(true)}
        className="bg-white border border-slate-200 hover:border-emerald-500 rounded-3xl p-5 shadow-sm cursor-pointer transition-all active:scale-[0.99] space-y-3"
      >
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Próximo Turno</span>

          {turno.estado === "ATRIBUIDO" && !turnoExpirado && (
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
              Atribuído
            </span>
          )}
          {turno.estado === "EM_CURSO" && !turnoExpirado && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Em Curso
            </span>
          )}
          {isConcluido && !isCancelado && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Concluído
            </span>
          )}
          {isCancelado && (
            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              Cancelado
            </span>
          )}
        </div>

        <div>
          <h3 className="font-bold text-slate-900 text-base">{turno.instituicao.nome}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" /> {turno.instituicao.morada}
          </p>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs text-slate-700 font-semibold">
          <span className="flex items-center gap-1 text-emerald-800">
            <Clock className="w-3.5 h-3.5" /> {turno.horaInicio} - {turno.horaFim}
          </span>
          {!isConcluido && !isCancelado && (
            <span className="text-xs text-emerald-700 font-bold">Ler QR Code para Ponto →</span>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">Registo de Ponto</h3>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="font-bold text-slate-800 text-sm">{turno.instituicao.nome}</div>
              <div className="text-slate-500 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-slate-400" /> {turno.instituicao.morada}
              </div>
              <div className="text-slate-700 font-semibold pt-1 border-t border-slate-200/60 flex items-center justify-between">
                <span>Horário Previsto:</span>
                <span className="text-emerald-800 font-bold">{turno.horaInicio} - {turno.horaFim}</span>
              </div>
            </div>

            {/* AÇÕES DE CHECK-IN / CHECK-OUT OU AVISO DE ESTADO ENCERRADO */}
            <div className="space-y-3">
              {turno.estado === "ATRIBUIDO" && !turnoExpirado && (
                <div className="space-y-2">
                  <button
                    onClick={irParaScanner}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                  >
                    <QrCode className="w-4 h-4" />
                    Ler QR Code da Instituição (Check-in)
                  </button>
                </div>
              )}

              {turno.estado === "EM_CURSO" && !turnoExpirado && (
                <div className="space-y-3">
                  {assiduidade?.entradaReal && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 text-center font-medium">
                      Check-in efetuado às{" "}
                      <strong>
                        {new Date(assiduidade.entradaReal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </strong>
                    </div>
                  )}
                  <button
                    onClick={irParaScanner}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                  >
                    <QrCode className="w-4 h-4" />
                    Ler QR Code da Instituição (Check-out)
                  </button>
                </div>
              )}

              {isConcluido && !isCancelado && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" /> Turno Concluído
                  </div>

                  {assiduidade?.saidaReal && (
                    <p className="text-[11px] text-emerald-700">
                      Check-out registado às{" "}
                      {new Date(assiduidade.saidaReal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {turno.motivoConclusao ? (
                    <div className="mt-1 pt-2 border-t border-emerald-200/60 flex items-start justify-center gap-1.5 text-[11px] text-slate-600 font-medium">
                      <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <span>Motivo: <strong className="text-slate-800">{turno.motivoConclusao}</strong></span>
                    </div>
                  ) : !assiduidade?.saidaReal ? (
                    <p className="text-[11px] text-amber-700 flex items-center justify-center gap-1 font-medium mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Concluído por expiração de horário
                    </p>
                  ) : null}
                </div>
              )}

              {isCancelado && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Turno Cancelado
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                    {turno.motivoConclusao || "Este turno foi cancelado por não haver atribuição de enfermeiro."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}