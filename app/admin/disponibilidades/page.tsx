"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { 
  Calendar as CalendarIcon, 
  List, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User,
  Plus,
  X,
  Users,
  CheckCircle2,
  XCircle
} from "lucide-react";
import DetalheTurnoModal from "@/components/DetalheTurnoModal";
import CriarTurnosDisponivelform from "@/components/CriarTurnosDisponivelForm";

interface Candidatura {
  id: string;
  estado: string;
  enfermeiro: {
    utilizador: {
      nome: string;
      email: string;
    };
  };
}

interface Turno {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  valorHora?: number;
  estado: string;
  instituicao: {
    nome: string;
    morada?: string;
  };
  atribuicoes?: Array<{
    enfermeiro: {
      utilizador: {
        nome: string;
        email: string;
      };
    };
  }>;
  candidaturas?: Candidatura[];
}

export default function AdminDisponibilidadesPage() {
  const [viewMode, setViewMode] = useState<"calendario" | "lista" | "candidaturas">("calendario");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(() => {
    const hoje = new Date();
    return hoje.toISOString().split("T")[0];
  });
  const [turnoDetalhe, setTurnoDetalhe] = useState<Turno | null>(null);
  const [isCriarModalOpen, setIsCriarModalOpen] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");

  const fetchTurnos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/turnos");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTurnos(data);
        } else if (data && Array.isArray(data.turnos)) {
          setTurnos(data.turnos);
        } else {
          setTurnos([]);
        }
      } else {
        setTurnos([]);
      }
    } catch (err) {
      console.error("Erro ao carregar turnos do admin:", err);
      setTurnos([]);
    }
  }, []);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  useAutoRefresh(fetchTurnos, 15000);

  // Gestão de Aprovação / Rejeição de Candidaturas
  const handleAprovarCandidatura = async (turnoId: string, candidaturaId: string, acao: "APROVAR" | "REJEITAR") => {
    try {
      const res = await fetch(`/api/admin/turnos/${turnoId}/candidaturas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidaturaId, acao }),
      });

      if (res.ok) {
        fetchTurnos();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao processar candidatura.");
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
      alert("Erro de comunicação com o servidor.");
    }
  };

  const turnosFiltrados = useMemo(() => {
    if (!Array.isArray(turnos)) return [];

    return turnos.filter((t) => {
      const enfermeiroNome = t.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome || "";
      const instNome = t.instituicao?.nome || "";
      const morada = t.instituicao?.morada || "";

      const matchesSearch =
        enfermeiroNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        morada.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const temEnfermeiro = Boolean(enfermeiroNome);
      const ePorAtribuir = !temEnfermeiro || t.estado === "PUBLICADO" || t.estado === "AGUARDAR_ENFERMEIRO";

      if (estadoFilter === "DISPONIVEIS") {
        return ePorAtribuir;
      }
      if (estadoFilter === "ATRIBUIDOS") {
        return temEnfermeiro && (t.estado === "ATRIBUIDO" || t.estado === "EM_CURSO");
      }
      if (estadoFilter === "CONCLUIDOS") {
        return t.estado === "CONCLUIDO";
      }

      return true;
    });
  }, [turnos, searchTerm, estadoFilter]);

  // Turnos que possuem candidaturas (especialmente úteis para a vista de Candidaturas)
  const turnosComCandidaturas = useMemo(() => {
    return turnos.filter((t) => t.candidaturas && t.candidaturas.length > 0);
  }, [turnos]);

  // Cálculos do Calendário
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const hoje = new Date();
    setCurrentDate(hoje);
    setDiaSelecionado(hoje.toISOString().split("T")[0]);
  };

  const getTurnosDoDiaFormatado = (dataISO: string) => {
    return turnosFiltrados.filter((t) => {
      if (!t?.data) return false;
      const dataApenas = t.data.split("T")[0];
      return dataApenas === dataISO;
    });
  };

  const getCorBadgeDia = (dataISO: string) => {
    const turnosDoDia = getTurnosDoDiaFormatado(dataISO);
    if (turnosDoDia.length === 0) return null;

    const temDisponivel = turnosDoDia.some((t) => {
      const temEnfermeiro = Boolean(t.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome);
      return !temEnfermeiro || t.estado === "PUBLICADO" || t.estado === "AGUARDAR_ENFERMEIRO";
    });
    if (temDisponivel) return "bg-amber-400";

    const temConcluido = turnosDoDia.some((t) => t.estado === "CONCLUIDO");
    if (temConcluido) return "bg-blue-500";

    return "bg-[#006B5D]";
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 text-slate-800 pb-20">
      {/* Título e Botão Publicar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Turnos</h1>
          <p className="text-xs text-slate-400">{turnosFiltrados.length} turnos encontrados</p>
        </div>
        <button 
          onClick={() => setIsCriarModalOpen(true)}
          className="bg-[#006B5D] hover:bg-[#005449] text-white text-xs font-bold px-3.5 py-2 rounded-2xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Novo Turno</span>
        </button>
      </div>

      {/* Alternador de Vista (Calendário / Lista / Candidaturas) */}
      <div className="bg-slate-100 p-1 rounded-2xl flex text-xs font-semibold gap-1">
        <button
          onClick={() => setViewMode("calendario")}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            viewMode === "calendario"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" /> Calendário
        </button>
        <button
          onClick={() => setViewMode("lista")}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            viewMode === "lista"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <List className="w-3.5 h-3.5" /> Lista
        </button>
        <button
          onClick={() => setViewMode("candidaturas")}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all relative ${
            viewMode === "candidaturas"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Candidaturas
          {turnosComCandidaturas.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-2 right-2"></span>
          )}
        </button>
      </div>

      {/* Filtros (Visíveis apenas nas vistas Calendário e Lista) */}
      {viewMode !== "candidaturas" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por enfermeiro ou instituição..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#006B5D]"
            />
          </div>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 font-medium focus:outline-none"
          >
            <option value="TODOS">Todos os estados</option>
            <option value="DISPONIVEIS">Disponíveis (Amarelo)</option>
            <option value="ATRIBUIDOS">Atribuídos (Verde)</option>
            <option value="CONCLUIDOS">Concluídos (Azul)</option>
          </select>
        </div>
      )}

      {/* VISTA: CANDIDATURAS */}
      {viewMode === "candidaturas" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900">
            <p className="font-bold">Validação de Candidaturas</p>
            <p className="text-[11px] text-amber-800 mt-0.5">Aprove a candidatura de um enfermeiro para atribuir o turno formalmente.</p>
          </div>

          {turnosComCandidaturas.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-600">Não existem candidaturas pendentes.</p>
            </div>
          ) : (
            turnosComCandidaturas.map((turno) => (
              <div key={turno.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{turno.instituicao.nome}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(turno.data).toLocaleDateString("pt-PT")} • {turno.horaInicio} - {turno.horaFim}
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    {turno.candidaturas?.length} {turno.candidaturas?.length === 1 ? 'Candidato' : 'Candidatos'}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {turno.candidaturas?.map((cand) => (
                    <div key={cand.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{cand.enfermeiro.utilizador.nome}</p>
                        <p className="text-[11px] text-slate-400">{cand.enfermeiro.utilizador.email}</p>
                        <p className="text-[10px] font-semibold mt-1">
                          Estado: <span className={cand.estado === "PENDENTE" ? "text-amber-600" : cand.estado === "ACEITE" ? "text-emerald-600" : "text-rose-600"}>{cand.estado}</span>
                        </p>
                      </div>

                      {cand.estado === "PENDENTE" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAprovarCandidatura(turno.id, cand.id, "APROVAR")}
                            className="bg-[#006B5D] hover:bg-[#005449] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                          </button>
                          <button
                            onClick={() => handleAprovarCandidatura(turno.id, cand.id, "REJEITAR")}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Rejeitar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA: CALENDÁRIO */}
      {viewMode === "calendario" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <CalendarIcon className="w-4 h-4 text-[#006B5D]" />
              <span className="capitalize">{monthNames[month]} de {year}</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleToday}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
              >
                Hoje
              </button>
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center gap-y-2 text-xs">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <span key={d} className="text-slate-400 font-medium pb-1">
                {d}
              </span>
            ))}

            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 w-full" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dia) => {
              const monthFormatted = String(month + 1).padStart(2, "0");
              const dayFormatted = String(dia).padStart(2, "0");
              const dataISO = `${year}-${monthFormatted}-${dayFormatted}`;

              const corBadgeClass = getCorBadgeDia(dataISO);
              const isSelected = diaSelecionado === dataISO;

              return (
                <button
                  key={dia}
                  onClick={() => setDiaSelecionado(dataISO)}
                  className={`h-10 w-full flex flex-col items-center justify-center rounded-2xl relative transition-all ${
                    isSelected ? "ring-2 ring-[#006B5D] font-bold" : "hover:bg-slate-50"
                  }`}
                >
                  <span className={`text-xs ${isSelected ? "text-slate-900 font-bold" : "text-slate-700"}`}>
                    {dia}
                  </span>
                  
                  {corBadgeClass && (
                    <span className={`w-2 h-2 rounded-full mt-0.5 ${corBadgeClass}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA: LISTA OU DETALHES DO DIA SELECIONADO */}
      {viewMode !== "candidaturas" && (
        (viewMode === "lista" 
          ? turnosFiltrados 
          : (diaSelecionado ? getTurnosDoDiaFormatado(diaSelecionado) : [])
        ).length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Nenhum turno encontrado.</p>
        ) : (
          <div className="space-y-3">
            {viewMode === "calendario" && diaSelecionado && (
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Turnos no dia {diaSelecionado.split("-")[2]} de {monthNames[parseInt(diaSelecionado.split("-")[1], 10) - 1]}
              </h2>
            )}

            {(viewMode === "lista" 
              ? turnosFiltrados 
              : getTurnosDoDiaFormatado(diaSelecionado!)
            ).map((turno) => {
              const enfermeiroNome = turno.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome;
              const isDisponivel = !enfermeiroNome || turno.estado === "PUBLICADO" || turno.estado === "AGUARDAR_ENFERMEIRO";
              const isConcluido = turno.estado === "CONCLUIDO";

              return (
                <div
                  key={turno.id}
                  onClick={() => setTurnoDetalhe(turno)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isConcluido
                      ? "bg-blue-50/60 border-blue-200 hover:border-blue-400"
                      : isDisponivel
                      ? "bg-amber-50/50 border-amber-200 hover:border-amber-400"
                      : "bg-emerald-50/50 border-emerald-200 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{turno.instituicao.nome}</h3>
                      {turno.instituicao.morada && (
                        <p className="text-xs text-slate-500 mt-0.5">{turno.instituicao.morada}</p>
                      )}
                    </div>

                    {isConcluido ? (
                      <span className="bg-[#EBF3FC] text-[#1E40AF] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        Concluído
                      </span>
                    ) : isDisponivel ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        Disponível
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        Atribuído
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-slate-600 flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Enfermeiro: <strong>{enfermeiroNome || "Por atribuir"}</strong>
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{turno.horaInicio} - {turno.horaFim}</span>
                    </div>
                    {turno.valorHora && (
                      <span className="text-slate-900 font-bold">{turno.valorHora}€/h</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* OVERLAY MODAL: CRIAR TURNO */}
      {isCriarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCriarModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <CriarTurnosDisponivelform
              onClose={() => setIsCriarModalOpen(false)}
              onSuccess={() => {
                setIsCriarModalOpen(false);
                fetchTurnos();
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL DETALHES REUTILIZÁVEL */}
      {turnoDetalhe && (
        <DetalheTurnoModal
          turno={turnoDetalhe}
          onClose={() => setTurnoDetalhe(null)}
          onPontoSuccess={fetchTurnos}
          isAdmin={true}
        />
      )}
    </div>
  );
}