"use client";

import { useState } from "react";
import { Clock, MapPin, Play, Square, CheckCircle2, Navigation, AlertTriangle, X, Info } from "lucide-react";

interface Turno {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  estado: "ATRIBUIDO" | "EM_CURSO" | "CONCLUIDO" | string;
  motivoConclusao?: string | null;
  instituicao: { nome: string; morada: string };
  assiduidades?: Array<{
    entradaReal?: string;
    saidaReal?: string;
  }>;
}

export function ProximoTurnoCard({ turno, onUpdate }: { turno: Turno; onUpdate?: () => void }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  const assiduidade = turno.assiduidades?.[0];

  // Verifica se o horário do turno já ultrapassou o horaFim
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

  const handlePonto = async (acao: "CHECK_IN" | "CHECK_OUT") => {
    setLoading(true);

    let lat: number | null = null;
    let lon: number | null = null;

    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch (e) {
        console.warn("Geolocalização indisponível.");
      }
    }

    try {
      const res = await fetch(`/api/turnos/${turno.id}/ponto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, lat, lon }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        setModalAberto(false);
        if (onUpdate) onUpdate();
      } else {
        alert(data.error || "Erro ao efetuar registo de ponto.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Cartão Clicável do Próximo Turno */}
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
          {(turno.estado === "CONCLUIDO" || turnoExpirado) && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Concluído
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
          <span className="text-xs text-emerald-700 font-bold">Clique para detalhes / ponto →</span>
        </div>
      </div>

      {/* POP-UP / MODAL DE PONTO DO ENFERMEIRO */}
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

            {/* AÇÕES DE CHECK-IN / CHECK-OUT */}
            <div className="space-y-3">
              {turno.estado === "ATRIBUIDO" && !turnoExpirado && (
                <div className="space-y-2">
                  <button
                    disabled={loading}
                    onClick={() => handlePonto("CHECK_IN")}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {loading ? "A registar entrada..." : "Fazer Check-in (Iniciar Turno)"}
                  </button>

                  <button
                    disabled={loading}
                    onClick={() => handlePonto("CHECK_OUT")}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Concluir Diretamente sem Check-in
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
                    disabled={loading}
                    onClick={() => handlePonto("CHECK_OUT")}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    {loading ? "A registar saída..." : "Fazer Check-out (Terminar Turno)"}
                  </button>
                </div>
              )}

              {(turno.estado === "CONCLUIDO" || turnoExpirado) && (
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}