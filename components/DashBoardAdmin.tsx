"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Building2, Calendar, Clock, X, AlertCircle } from "lucide-react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

interface Turno {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  estado?: string;
  motivoConclusao?: string | null;
  instituicao: { nome: string };
  atribuicoes?: Array<{
    enfermeiro: { utilizador: { nome: string } };
  }>;
  assiduidades?: Array<{ entradaReal?: string; saidaReal?: string }>;
}

interface DashboardStats {
  enfermeirosCount: number;
  instituicoesCount: number;
  turnosAtribuidosCount: number;
  turnosPublicadosCount: number;
  turnosAtribuidosLista: Turno[];
  turnosPublicadosLista: Turno[];
}

export default function DashboardAdmin() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"ATRIBUIDOS" | "PUBLICADOS">("ATRIBUIDOS");

  // Função para procurar as estatísticas envelopada em useCallback
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Erro no DashboardAdmin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inicial
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Atualização automática dos dados a cada 15 segundos
  useAutoRefresh(fetchStats, 15000);

  if (loading) {
    return <div className="text-xs text-slate-400 py-4 text-center">A carregar dados do administrador...</div>;
  }

  const openModal = (tab: "ATRIBUIDOS" | "PUBLICADOS") => {
    setActiveTab(tab);
    setShowModal(true);
  };

  const getMensagemConclusao = (turno: Turno, temEnfermeiro: boolean) => {
    if (!temEnfermeiro) {
      return "Concluído (Sem enfermeiro atribuído).";
    }
    if (turno.motivoConclusao) {
      return `Concluído (${turno.motivoConclusao}).`;
    }
    if (turno.assiduidades?.[0]?.saidaReal) {
      return "Concluído (Check-out efetuado).";
    }
    return "Concluído por expiração de horário.";
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-PT", { timeZone: "UTC" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      {/* Cards de Métricas */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">Enfermeiros Ativos</p>
          <h2 className="text-2xl font-black text-slate-900 mt-0.5">{stats?.enfermeirosCount ?? 0}</h2>
        </div>
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
          <Users className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">Instituições</p>
          <h2 className="text-2xl font-black text-slate-900 mt-0.5">{stats?.instituicoesCount ?? 0}</h2>
        </div>
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <Building2 className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm space-y-3">
        <div onClick={() => openModal("ATRIBUIDOS")} className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-xs text-slate-400 font-medium">Turnos Atribuídos</p>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">{stats?.turnosAtribuidosCount ?? 0}</h2>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">{stats?.turnosPublicadosCount ?? 0} por atribuir</span>
          <button onClick={() => openModal("PUBLICADOS")} className="text-xs text-amber-600 font-bold hover:underline cursor-pointer">
            Ver por atribuir →
          </button>
        </div>
      </div>

      {/* Modal Admin */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Gestão de Turnos</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab("ATRIBUIDOS")}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${activeTab === "ATRIBUIDOS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                Atribuídos ({stats?.turnosAtribuidosCount ?? 0})
              </button>
              <button
                onClick={() => setActiveTab("PUBLICADOS")}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${activeTab === "PUBLICADOS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                Por Atribuir ({stats?.turnosPublicadosCount ?? 0})
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {activeTab === "ATRIBUIDOS" ? (
                stats?.turnosAtribuidosLista && stats.turnosAtribuidosLista.length > 0 ? (
                  stats.turnosAtribuidosLista.map((turno) => {
                    const enfermeiroObj = turno.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome;
                    const temEnfermeiro = !!enfermeiroObj;
                    const enfermeiroNome = enfermeiroObj || "Não atribuído";

                    return (
                      <div key={turno.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-900 text-sm">{turno.instituicao.nome}</span>
                          <span className="text-xs text-slate-500">{formatDate(turno.data)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-emerald-800" />
                          <span>{turno.horaInicio} - {turno.horaFim}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 text-xs">
                          <span className="text-slate-400">Enfermeiro: </span>
                          <strong className="text-slate-800">{enfermeiroNome}</strong>

                          {turno.estado === "EM_CURSO" && (
                            <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                              Em curso (Check-in efetuado).
                            </div>
                          )}

                          {turno.estado === "CONCLUIDO" && (
                            <div className="mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-medium">
                              {getMensagemConclusao(turno, temEnfermeiro)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-6">Nenhum turno atribuído de momento.</p>
                )
              ) : (
                stats?.turnosPublicadosLista && stats.turnosPublicadosLista.length > 0 ? (
                  stats.turnosPublicadosLista.map((turno) => (
                    <div key={turno.id} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900 text-sm">{turno.instituicao.nome}</span>
                        <span className="text-xs text-slate-500">{formatDate(turno.data)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>{turno.horaInicio} - {turno.horaFim}</span>
                      </div>
                      <div className="text-xs text-amber-700 font-medium flex items-center gap-1 pt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Aguarda Enfermeiro
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-6">Nenhum turno pendente de atribuição.</p>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}