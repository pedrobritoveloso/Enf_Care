"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, MapPin, CheckCircle2, Play, Square, X, Navigation, Undo2 } from "lucide-react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

interface ProximoTurno {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  estado?: string;
  instituicao: {
    nome: string;
    morada?: string;
  };
}

interface EnfermeiroStats {
  totalTurnosAceites: number;
  proximoTurno?: ProximoTurno | null;
}

/**
 * Valida se o check-in é permitido:
 * Ativa apenas a partir de 10 minutos antes da horaInicio do turno até ao final.
 */
function podeFazerCheckIn(dataTurnoStr: string, horaInicioStr: string, horaFimStr: string): boolean {
  if (!dataTurnoStr || !horaInicioStr || !horaFimStr) return false;
  const agora = new Date();

  const dataApenas = dataTurnoStr.split("T")[0];
  const inicioTurno = new Date(`${dataApenas}T${horaInicioStr}:00`);
  const fimTurno = new Date(`${dataApenas}T${horaFimStr}:00`);

  // Caso o turno termine no dia seguinte (ex: 22:00 às 06:00)
  if (fimTurno < inicioTurno) {
    fimTurno.setDate(fimTurno.getDate() + 1);
  }

  // Limite inferior: 10 minutos antes do início
  const limiteInicio = new Date(inicioTurno.getTime() - 10 * 60 * 1000);

  return agora >= limiteInicio && agora <= fimTurno;
}

export default function DashboardEnfermeiro() {
  const [stats, setStats] = useState<EnfermeiroStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPontoModal, setShowPontoModal] = useState(false);
  const [processando, setProcessando] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Erro ao carregar métricas do enfermeiro");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Erro ao carregar dashboard enfermeiro:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inicial
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Re-fetch periódico a cada 15 segundos
  useAutoRefresh(fetchStats, 15000);

  const handlePonto = async (acao: "CHECK_IN" | "CHECK_OUT" | "UNDO_CHECK_IN") => {
    if (!stats?.proximoTurno) return;
    setProcessando(true);

    let lat: number | null = null;
    let lon: number | null = null;

    if ("geolocation" in navigator && acao !== "UNDO_CHECK_IN") {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch (e) {
        console.warn("Geolocalização indisponível ou permissão recusada.", e);
      }
    }

    try {
      const res = await fetch(`/api/turnos/${stats.proximoTurno.id}/ponto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, lat, lon }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Operação realizada com sucesso!");
        setShowPontoModal(false);
        fetchStats();
      } else {
        alert(data.error || "Erro ao registar operação.");
      }
    } catch (err) {
      console.error("Erro ao comunicar com o servidor:", err);
      alert("Erro de ligação ao servidor.");
    } finally {
      setProcessando(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-PT", { timeZone: "UTC" });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <div className="text-xs text-slate-400 py-4 text-center">A carregar dados do enfermeiro...</div>;
  }

  const proximoTurno = stats?.proximoTurno;

  return (
    <div className="space-y-4">
      {/* Próximo Turno */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <p className="text-xs text-slate-400 font-medium mb-3">Próximo Turno Aceite</p>

        {proximoTurno ? (
          <div
            onClick={() => setShowPontoModal(true)}
            className="space-y-3 bg-slate-50 hover:bg-slate-100/80 p-4 rounded-2xl border border-slate-200 cursor-pointer transition-all active:scale-[0.99]"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-slate-900 text-base">{proximoTurno.instituicao.nome}</h3>
              {proximoTurno.estado === "EM_CURSO" ? (
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Em Curso
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Confirmado
                </span>
              )}
            </div>

            {proximoTurno.instituicao.morada && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-emerald-800" />
                <span>{proximoTurno.instituicao.morada}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                  <span>{formatDate(proximoTurno.data)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-800" />
                  <span>{proximoTurno.horaInicio} - {proximoTurno.horaFim}</span>
                </div>
              </div>
              <span className="text-emerald-700 font-bold hover:underline">Check-in / Out →</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Ainda não aceitou nenhum turno próximo.
          </div>
        )}
      </div>

      {/* Card Total de Turnos */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">Total de Turnos Aceites</p>
          <h2 className="text-2xl font-black text-slate-900 mt-0.5">{stats?.totalTurnosAceites ?? 0}</h2>
        </div>
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      {/* Modal Ponto */}
      {showPontoModal && proximoTurno && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Registo de Ponto</h3>
                <p className="text-xs text-slate-400">Marque a entrada, saída ou anule o check-in</p>
              </div>
              <button onClick={() => setShowPontoModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="font-bold text-slate-800 text-sm">{proximoTurno.instituicao.nome}</div>
              {proximoTurno.instituicao.morada && (
                <div className="text-slate-500 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-slate-400" /> {proximoTurno.instituicao.morada}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-1">
              {/* Mensagem se o Check-in ainda não estiver disponível */}
              {proximoTurno.estado !== "EM_CURSO" &&
                proximoTurno.estado !== "CONCLUIDO" &&
                !podeFazerCheckIn(proximoTurno.data, proximoTurno.horaInicio, proximoTurno.horaFim) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-2xl font-medium text-center">
                    O check-in só fica disponível <strong>10 minutos antes</strong> do início do turno.
                  </div>
                )}

              {/* Botão de Check-in */}
              {proximoTurno.estado !== "EM_CURSO" && proximoTurno.estado !== "CONCLUIDO" && (
                <button
                  disabled={
                    !podeFazerCheckIn(proximoTurno.data, proximoTurno.horaInicio, proximoTurno.horaFim) ||
                    processando
                  }
                  onClick={() => handlePonto("CHECK_IN")}
                  className={`w-full font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all ${
                    podeFazerCheckIn(proximoTurno.data, proximoTurno.horaInicio, proximoTurno.horaFim) && !processando
                      ? "bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm cursor-pointer"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {processando ? "A registar entrada..." : "Fazer Check-in (Iniciar Turno)"}
                </button>
              )}

              {/* Opções quando o Turno está em curso */}
              {proximoTurno.estado === "EM_CURSO" && (
                <>
                  <button
                    disabled={processando}
                    onClick={() => handlePonto("CHECK_OUT")}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    {processando ? "A registar saída..." : "Fazer Check-out (Terminar Turno)"}
                  </button>

                  <button
                    disabled={processando}
                    onClick={() => handlePonto("UNDO_CHECK_IN")}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Undo2 className="w-4 h-4 text-slate-500" />
                    {processando ? "A anular..." : "Anular Check-in"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}