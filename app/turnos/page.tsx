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
  User,
  X,
  Send,
  UserX,
  RefreshCw,
  UserCheck,
  Info
} from "lucide-react";

interface Turno {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  valorHora?: number;
  estado: "PUBLICADO" | "AGUARDAR_ENFERMEIRO" | "ATRIBUIDO" | "EM_CURSO" | "CONCLUIDO" | "CANCELADO";
  motivoConclusao?: string | null;
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

interface Enfermeiro {
  id: string;
  nome: string;
  email: string;
}

export default function TurnosPage() {
  const [viewMode, setViewMode] = useState<"calendario" | "lista">("calendario");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(new Date().getDate());
  
  const [turnoDetalhe, setTurnoDetalhe] = useState<Turno | null>(null);
  const [submetendo, setSubmetendo] = useState(false);

  // Estados para o Modal de Substituição / Troca de Turno
  const [modalTrocaAberto, setModalTrocaAberto] = useState(false);
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  const [meuEmail, setMeuEmail] = useState<string | null>(null);
  const [searchTermTroca, setSearchTermTroca] = useState("");
  const [enfermeiroSelecionado, setEnfermeiroSelecionado] = useState<string>("");
  const [loadingEnfermeiros, setLoadingEnfermeiros] = useState(false);

  // Filtros da página
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

  const handleRemoverCandidatura = async (turnoId: string) => {
    if (!confirm("Tem a certeza de que pretende retirar a sua candidatura deste turno?")) {
      return;
    }

    setSubmetendo(true);
    try {
      const res = await fetch(`/api/turnos/${turnoId}/desassociar`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Candidatura removida com sucesso.");
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

  const abrirModalTroca = async () => {
    setModalTrocaAberto(true);
    try {
      setLoadingEnfermeiros(true);
      const resEnf = await fetch("/api/admin/enfermeiros");
      if (resEnf.ok) {
        const dataEnf = await resEnf.json();
        if (Array.isArray(dataEnf)) setEnfermeiros(dataEnf);
      }

      const resSession = await fetch("/api/auth/session");
      if (resSession.ok) {
        const sessionData = await resSession.json();
        if (sessionData?.user?.email) {
          setMeuEmail(sessionData.user.email);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar enfermeiros para troca:", err);
    } finally {
      setLoadingEnfermeiros(false);
    }
  };

  const executarTrocaTurno = async () => {
    if (!turnoDetalhe || !enfermeiroSelecionado) {
      alert("Por favor selecione o colega para realizar a substituição.");
      return;
    }

    setSubmetendo(true);
    try {
      const res = await fetch(`/api/turnos/${turnoDetalhe.id}/trocar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novoEnfermeiroId: enfermeiroSelecionado }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Substituição de turno efetuada com sucesso!");
        setModalTrocaAberto(false);
        setTurnoDetalhe(null);
        setEnfermeiroSelecionado("");
        setSearchTermTroca("");
        fetchTurnos();
      } else {
        alert(data.error || "Erro ao efetuar a substituição.");
      }
    } catch (err) {
      console.error("Erro ao efetuar substituição:", err);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setSubmetendo(false);
    }
  };

  const enfermeirosFiltrados = enfermeiros.filter((enf) => {
    if (meuEmail && enf.email?.toLowerCase() === meuEmail.toLowerCase()) {
      return false;
    }
    const termo = searchTermTroca.toLowerCase();
    const nome = enf.nome?.toLowerCase() || "";
    const email = enf.email?.toLowerCase() || "";
    return nome.includes(termo) || email.includes(termo);
  });

  const turnosFiltrados = useMemo(() => {
    if (!Array.isArray(turnos)) return [];

    return turnos.filter((t) => {
      const enfermeiroNome = t.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome || "";
      const instNome = t.instituicao?.nome || "";

      const matchesSearch =
        enfermeiroNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instNome.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const semEnfermeiro = !t.atribuicoes || t.atribuicoes.length === 0 || !t.atribuicoes[0]?.enfermeiro?.utilizador?.nome;
      const estadoEfetivo = (t.estado === "CONCLUIDO" && semEnfermeiro) ? "CANCELADO" : t.estado;

      if (estadoFilter === "DISPONIVEIS") {
        return estadoEfetivo === "PUBLICADO" || estadoEfetivo === "AGUARDAR_ENFERMEIRO";
      }
      if (estadoFilter === "ATRIBUIDOS") {
        return estadoEfetivo === "ATRIBUIDO";
      }
      if (estadoFilter === "EM_CURSO") {
        return estadoEfetivo === "EM_CURSO";
      }
      if (estadoFilter === "CONCLUIDOS") {
        return estadoEfetivo === "CONCLUIDO";
      }
      if (estadoFilter === "CANCELADOS") {
        return estadoEfetivo === "CANCELADO";
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

    const temCancelado = turnosDoDia.some((t) => {
      const semEnfermeiro = !t.atribuicoes || t.atribuicoes.length === 0 || !t.atribuicoes[0]?.enfermeiro?.utilizador?.nome;
      return t.estado === "CANCELADO" || (t.estado === "CONCLUIDO" && semEnfermeiro);
    });
    if (temCancelado) return "bg-rose-500";

    const temEmCurso = turnosDoDia.some((t) => t.estado === "EM_CURSO");
    if (temEmCurso) return "bg-amber-500 animate-pulse";

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
          <option value="EM_CURSO">Em Curso (Âmbar)</option>
          <option value="CONCLUIDOS">Concluídos (Azul)</option>
          <option value="CANCELADOS">Cancelados (Vermelho)</option>
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
            const semEnfermeiro = !turno.atribuicoes || turno.atribuicoes.length === 0 || !turno.atribuicoes[0]?.enfermeiro?.utilizador?.nome;
            const estadoEfetivo = (turno.estado === "CONCLUIDO" && semEnfermeiro) ? "CANCELADO" : turno.estado;

            const isDisponivel = estadoEfetivo === "PUBLICADO" || estadoEfetivo === "AGUARDAR_ENFERMEIRO";
            const isEmCurso = estadoEfetivo === "EM_CURSO";
            const isConcluido = estadoEfetivo === "CONCLUIDO";
            const isCancelado = estadoEfetivo === "CANCELADO";
            const enfermeiroNome = turno.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome;

            return (
              <div
                key={turno.id}
                onClick={() => setTurnoDetalhe(turno)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isCancelado
                    ? "bg-rose-50/60 border-rose-200 hover:border-rose-400"
                    : isConcluido
                    ? "bg-blue-50/60 border-blue-200 hover:border-blue-400"
                    : isEmCurso
                    ? "bg-amber-50 border-amber-300 hover:border-amber-400 ring-1 ring-amber-300"
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

                  {isCancelado ? (
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                      Cancelado
                    </span>
                  ) : isConcluido ? (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                      Concluído
                    </span>
                  ) : isEmCurso ? (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Em Curso
                    </span>
                  ) : isDisponivel ? (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                      Disponível
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Atribuído
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xs text-slate-600 flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Enfermeiro: <strong>{enfermeiroNome || "Por atribuir"}</strong></span>
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
      )}

      {/* MODAL DE DETALHES E CANDIDATURA / SUBSTITUIÇÃO */}
      {turnoDetalhe && !modalTrocaAberto && (() => {
        const semEnfermeiro = !turnoDetalhe.atribuicoes || turnoDetalhe.atribuicoes.length === 0 || !turnoDetalhe.atribuicoes[0]?.enfermeiro?.utilizador?.nome;
        const estadoEfetivo = (turnoDetalhe.estado === "CONCLUIDO" && semEnfermeiro) ? "CANCELADO" : turnoDetalhe.estado;
        const isEncerrado = estadoEfetivo === "CONCLUIDO" || estadoEfetivo === "CANCELADO";

        return (
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

              {/* AVISO / MOTIVO SE ESTIVER CONCLUÍDO OU CANCELADO */}
              {isEncerrado ? (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className={`p-4 rounded-2xl text-xs space-y-1 border ${
                    estadoEfetivo === "CANCELADO"
                      ? "bg-rose-50/80 border-rose-200 text-rose-900"
                      : "bg-blue-50/80 border-blue-200 text-blue-900"
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>{estadoEfetivo === "CANCELADO" ? "Turno Cancelado" : "Turno Concluído"}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed mt-1">
                      {turnoDetalhe.motivoConclusao || (
                        estadoEfetivo === "CANCELADO"
                          ? "Turno cancelado por falta de atribuição de enfermeiro."
                          : "Turno concluído com sucesso."
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                /* BOTÕES DE AÇÃO CONDICIONADOS */
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {turnoDetalhe.temMinhaCandidaturaPendente ? (
                    <button
                      onClick={() => handleRemoverCandidatura(turnoDetalhe.id)}
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
                  ) : turnoDetalhe.atribuidoAMim && turnoDetalhe.estado !== "EM_CURSO" ? (
                    <button
                      onClick={abrirModalTroca}
                      disabled={submetendo}
                      className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 border border-emerald-200 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Substituir Turno (Trocar com Colega)
                    </button>
                  ) : (
                    <div className="text-center p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium">
                      {turnoDetalhe.estado === "EM_CURSO"
                        ? "Este turno encontra-se atualmente em curso."
                        : "Este turno já se encontra atribuído a outro enfermeiro."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL DE SELEÇÃO DE ENFERMEIRO PARA SUBSTITUIÇÃO */}
      {modalTrocaAberto && turnoDetalhe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Substituir Turno</h3>
                <p className="text-[11px] text-slate-500">
                  {turnoDetalhe.instituicao.nome} • {new Date(turnoDetalhe.data).toLocaleDateString("pt-PT")}
                </p>
              </div>
              <button
                onClick={() => setModalTrocaAberto(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Selecione o colega para realizar a substituição:
              </label>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou email..."
                  value={searchTermTroca}
                  onChange={(e) => setSearchTermTroca(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-100 p-2 rounded-2xl">
                {loadingEnfermeiros ? (
                  <p className="text-xs text-slate-400 text-center py-4">A carregar enfermeiros...</p>
                ) : enfermeirosFiltrados.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum enfermeiro encontrado.</p>
                ) : (
                  enfermeirosFiltrados.map((enf) => (
                    <div
                      key={enf.id}
                      onClick={() => setEnfermeiroSelecionado(enf.id)}
                      className={`p-3 rounded-xl border text-xs flex justify-between items-center cursor-pointer transition-all ${
                        enfermeiroSelecionado === enf.id
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold"
                          : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{enf.nome || "Sem Nome"}</p>
                        <p className="text-[10px] text-slate-400">{enf.email}</p>
                      </div>
                      {enfermeiroSelecionado === enf.id && (
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setModalTrocaAberto(false)}
                className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={executarTrocaTurno}
                disabled={submetendo || !enfermeiroSelecionado}
                className="flex-1 py-3 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-2xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submetendo ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirmar Substituição"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}