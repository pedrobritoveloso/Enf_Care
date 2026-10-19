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
  MapPin, 
  CheckCircle2, 
  User,
  X,
  Send,
  UserX
} from "lucide-react";

interface Turno {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  valorHora?: number;
  estado: "PUBLICADO" | "AGUARDAR_ENFERMEIRO" | "ATRIBUIDO" | "EM_CURSO" | "CONCLUIDO";
  instituicao: {
    nome: string;
    morada?: string;
  };
  atribuicoes?: Array<{
    enfermeiro?: {
      id?: string;
      utilizador?: { nome?: string; email?: string };
    };
  }>;
  candidaturas?: Array<{
    id: string;
    estado: string;
  }>;
  atribuidoAMim?: boolean;
  temMinhaCandidaturaPendente?: boolean;
}

export default function TurnosPage() {
  const [viewMode, setViewMode] = useState<"calendario" | "lista">("calendario");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(new Date().getDate());
  
  const [turnoDetalhe, setTurnoDetalhe] = useState<Turno | null>(null);
  const [submetendo, setSubmetendo] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");

  const fetchTurnos = useCallback(async () => {
    try {
      const res = await fetch("/api/turnos");
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
      console.error("Erro ao carregar turnos:", err);
      setTurnos([]);
    }
  }, []);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  useAutoRefresh(fetchTurnos, 15000);

  // Função para o enfermeiro submeter candidatura ao turno
  const handleCandidatar = async (turnoId: string) => {
    setSubmetendo(true);
    try {
      const res = await fetch(`/api/turnos/${turnoId}/inscrever`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Candidatura submetida com sucesso!");
        setTurnoDetalhe(null);
        fetchTurnos();
      } else {
        alert(data.error || "Erro ao submeter candidatura.");
      }
    } catch (err) {
      console.error("Erro ao candidatar:", err);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setSubmetendo(false);
    }
  };

  // Função para remover candidatura pendente ou desistir de turno atribuído
  const handleRemoverOuDesistir = async (turnoId: string) => {
    if (!confirm("Tem a certeza de que pretende retirar a sua candidatura/desistir deste turno?")) {
      return;
    }

    setSubmetendo(true);
    try {
      const res = await fetch(`/api/turnos/${turnoId}/desassociar`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Ação efetuada com sucesso.");
        setTurnoDetalhe(null);
        fetchTurnos();
      } else {
        alert(data.error || "Erro ao processar ação.");
      }
    } catch (err) {
      console.error("Erro ao processar:", err);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setSubmetendo(false);
    }
  };

  const turnosFiltrados = useMemo(() => {
    if (!Array.isArray(turnos)) return [];

    return turnos.filter((t) => {
      const enfermeiroNome = t.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome || "";
      const instNome = t.instituicao?.nome || "";

      const matchesSearch =
        enfermeiroNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instNome.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (estadoFilter === "DISPONIVEIS") {
        return t.estado === "PUBLICADO" || t.estado === "AGUARDAR_ENFERMEIRO";
      }
      if (estadoFilter === "ATRIBUIDOS") {
        return t.estado === "ATRIBUIDO" || t.estado === "EM_CURSO";
      }
      if (estadoFilter === "CONCLUIDOS") {
        return t.estado === "CONCLUIDO";
      }

      return true;
    });
  }, [turnos, searchTerm, estadoFilter]);

  const anoAtual = currentDate.getFullYear();
  const mesAtual = currentDate.getMonth();
  const totalDiasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

  const nomeMesFormatado = currentDate.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const nomeMesCapitalizado = nomeMesFormatado.charAt(0).toUpperCase() + nomeMesFormatado.slice(1);

  const handleMesAnterior = () => setCurrentDate(new Date(anoAtual, mesAtual - 1, 1));
  const handleMesSeguinte = () => setCurrentDate(new Date(anoAtual, mesAtual + 1, 1));
  const handleIrParaHoje = () => {
    const hoje = new Date();
    setCurrentDate(hoje);
    setDiaSelecionado(hoje.getDate());
  };

  const getTurnosDoDia = (dia: number) => {
    return turnosFiltrados.filter((t) => {
      if (!t?.data) return false;
      const d = new Date(t.data);
      return (
        d.getDate() === dia &&
        d.getMonth() === mesAtual &&
        d.getFullYear() === anoAtual
      );
    });
  };

  const getCorBadgeDia = (dia: number) => {
    const turnosDoDia = getTurnosDoDia(dia);
    if (turnosDoDia.length === 0) return null;

    const temConcluido = turnosDoDia.some((t) => t.estado === "CONCLUIDO");
    if (temConcluido) return "bg-blue-500";

    const temDisponivel = turnosDoDia.some(
      (t) => t.estado === "PUBLICADO" || t.estado === "AGUARDAR_ENFERMEIRO"
    );
    if (temDisponivel) return "bg-amber-400";

    return "bg-emerald-500";
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 text-slate-800 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Turnos Disponíveis</h1>
        <p className="text-xs text-slate-400">{turnosFiltrados.length} turnos encontrados</p>
      </div>

      {/* Alternador de Vista */}
      <div className="bg-slate-100 p-1 rounded-2xl flex text-xs font-semibold">
        <button
          onClick={() => setViewMode("calendario")}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
            viewMode === "calendario" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Calendário
        </button>
        <button
          onClick={() => setViewMode("lista")}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
            viewMode === "lista" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <List className="w-4 h-4" /> Lista
        </button>
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por enfermeiro ou instituição..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 font-medium"
        >
          <option value="TODOS">Todos os estados</option>
          <option value="DISPONIVEIS">Disponíveis (Amarelo)</option>
          <option value="ATRIBUIDOS">Atribuídos (Verde)</option>
          <option value="CONCLUIDOS">Concluídos (Azul)</option>
        </select>
      </div>

      {/* VISTA: CALENDÁRIO */}
      {viewMode === "calendario" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <CalendarIcon className="w-4 h-4 text-emerald-700" />
              <span>{nomeMesCapitalizado}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleIrParaHoje} className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
                Hoje
              </button>
              <button onClick={handleMesAnterior} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleMesSeguinte} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center gap-y-2 text-xs">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <span key={d} className="text-slate-400 font-medium pb-1">{d}</span>
            ))}

            {(() => {
              const primeiroDiaDoMes = new Date(anoAtual, mesAtual, 1).getDay();
              const diasVaziosIniciais = Array.from({ length: primeiroDiaDoMes }, (_, i) => i);
              const diasDoMes = Array.from({ length: totalDiasNoMes }, (_, i) => i + 1);

              return (
                <>
                  {diasVaziosIniciais.map((vazio) => (
                    <div key={`vazio-${vazio}`} className="h-10 w-full" />
                  ))}

                  {diasDoMes.map((dia) => {
                    const corBadgeClass = getCorBadgeDia(dia);
                    const isSelected = diaSelecionado === dia;

                    return (
                      <button
                        key={dia}
                        onClick={() => setDiaSelecionado(dia)}
                        className={`h-10 w-full flex flex-col items-center justify-center rounded-2xl relative transition-all ${
                          isSelected ? "ring-2 ring-emerald-800 font-bold" : ""
                        }`}
                      >
                        <span className={`text-xs ${isSelected ? "text-emerald-900 font-bold" : "text-slate-700"}`}>
                          {dia}
                        </span>
                        {corBadgeClass && <span className={`w-2 h-2 rounded-full mt-0.5 ${corBadgeClass}`} />}
                      </button>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* VISTA: LISTA OU CALENDÁRIO DETALHES */}
      {(viewMode === "lista" ? turnosFiltrados : (diaSelecionado ? getTurnosDoDia(diaSelecionado) : [])).length === 0 ? (
        <p className="text-xs text-slate-400 italic">Nenhum turno encontrado.</p>
      ) : (
        <div className="space-y-3">
          {viewMode === "calendario" && diaSelecionado && (
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Turnos no dia {diaSelecionado} de {currentDate.toLocaleString("pt-PT", { month: "long" })}
            </h2>
          )}

          {(viewMode === "lista" ? turnosFiltrados : getTurnosDoDia(diaSelecionado!)).map((turno) => {
            const isDisponivel = turno.estado === "PUBLICADO" || turno.estado === "AGUARDAR_ENFERMEIRO";
            const isConcluido = turno.estado === "CONCLUIDO";
            const enfermeiroNome = turno.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome;

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
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
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

                {enfermeiroNome && (
                  <div className="mt-2 text-xs text-slate-600 flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Enfermeiro: <strong>{enfermeiroNome}</strong></span>
                  </div>
                )}

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
      )}

      {/* MODAL DE DETALHES E CANDIDATURA / DESISTÊNCIA DO ENFERMEIRO */}
      {turnoDetalhe && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Detalhes do Turno</h3>
              <button onClick={() => setTurnoDetalhe(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Instituição</span>
                <strong className="text-slate-900 text-sm">{turnoDetalhe.instituicao.nome}</strong>
                {turnoDetalhe.instituicao.morada && (
                  <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" /> {turnoDetalhe.instituicao.morada}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block">Data</span>
                  <span className="font-bold text-slate-800">{new Date(turnoDetalhe.data).toLocaleDateString("pt-PT")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Horário</span>
                  <span className="font-bold text-slate-800">{turnoDetalhe.horaInicio} - {turnoDetalhe.horaFim}</span>
                </div>
              </div>

              {turnoDetalhe.valorHora && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block">Remuneração</span>
                  <span className="font-bold text-emerald-800 text-sm">{turnoDetalhe.valorHora}€ / hora</span>
                </div>
              )}
            </div>

            {/* BOTÕES DE AÇÃO CONDICIONADOS */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              {turnoDetalhe.temMinhaCandidaturaPendente ? (
                <button
                  onClick={() => handleRemoverOuDesistir(turnoDetalhe.id)}
                  disabled={submetendo}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 border border-rose-200"
                >
                  <UserX className="w-4 h-4" />
                  {submetendo ? "A remover..." : "Remover Candidatura"}
                </button>
              ) : (turnoDetalhe.estado === "PUBLICADO" || turnoDetalhe.estado === "AGUARDAR_ENFERMEIRO") && !turnoDetalhe.atribuidoAMim ? (
                <button
                  onClick={() => handleCandidatar(turnoDetalhe.id)}
                  disabled={submetendo}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submetendo ? "A submeter candidatura..." : "Candidatar-me a este Turno"}
                </button>
              ) : turnoDetalhe.atribuidoAMim ? (
                <button
                  onClick={() => handleRemoverOuDesistir(turnoDetalhe.id)}
                  disabled={submetendo}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 border border-rose-200"
                >
                  <UserX className="w-4 h-4" />
                  {submetendo ? "A processar..." : "Desistir do Turno"}
                </button>
              ) : (
                <div className="text-center p-3 bg-slate-50 rounded-2xl text-xs text-slate-500 font-medium">
                  {turnoDetalhe.estado === "ATRIBUIDO"
                    ? "Este turno já se encontra atribuído a outro enfermeiro."
                    : "Este turno já se encontra em curso ou concluído."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}