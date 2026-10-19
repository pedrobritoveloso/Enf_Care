"use client";

import { useState, useEffect, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { 
  Calendar as CalendarIcon, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  X,
  RefreshCw,
  Search,
  UserCheck
} from "lucide-react";

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
  assiduidades?: Array<{
    entradaReal?: string;
    saidReal?: string;
  }>;
}

interface Enfermeiro {
  id: string;
  nome: string;
  email: string;
}

export default function MeuHorarioPage() {
  const [viewMode, setViewMode] = useState<"calendario" | "lista">("calendario");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(new Date().getDate());
  const [turnoDetalhe, setTurnoDetalhe] = useState<Turno | null>(null);

  // Estados para o Modal de Troca / Substituição
  const [modalTrocaAberto, setModalTrocaAberto] = useState(false);
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [enfermeiroSelecionado, setEnfermeiroSelecionado] = useState<string>("");
  const [loadingEnfermeiros, setLoadingEnfermeiros] = useState(false);
  const [submetendoTroca, setSubmetendoTroca] = useState(false);

  const fetchMeuHorario = useCallback(async () => {
    try {
      const res = await fetch("/api/enfermeiro/horario");
      if (res.ok) {
        const data = await res.json();
        setTurnos(Array.isArray(data) ? data : data.turnos || []);
      } else {
        setTurnos([]);
      }
    } catch (err) {
      console.error("Erro ao carregar o horário:", err);
      setTurnos([]);
    }
  }, []);

  useEffect(() => {
    fetchMeuHorario();
  }, [fetchMeuHorario]);

  useAutoRefresh(fetchMeuHorario, 15000);

  // Carregar lista de enfermeiros para a troca
  const carregarEnfermeirosParaTroca = async () => {
    try {
      setLoadingEnfermeiros(true);
      const res = await fetch("/api/admin/enfermeiros");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setEnfermeiros(data);
      }
    } catch (err) {
      console.error("Erro ao carregar enfermeiros:", err);
    } finally {
      setLoadingEnfermeiros(false);
    }
  };

  const abrirModalTroca = () => {
    carregarEnfermeirosParaTroca();
    setModalTrocaAberto(true);
  };

  const executarTrocaTurno = async () => {
    if (!turnoDetalhe || !enfermeiroSelecionado) {
      alert("Por favor selecione o enfermeiro para quem quer transferir o turno.");
      return;
    }

    setSubmetendoTroca(true);
    try {
      const res = await fetch(`/api/turnos/${turnoDetalhe.id}/trocar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novoEnfermeiroId: enfermeiroSelecionado }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Troca de turno efetuada com sucesso!");
        setModalTrocaAberto(false);
        setTurnoDetalhe(null);
        setEnfermeiroSelecionado("");
        setSearchTerm("");
        fetchMeuHorario();
      } else {
        alert(data.error || "Erro ao efetuar a troca de turno.");
      }
    } catch (err) {
      console.error("Erro ao efetuar troca:", err);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setSubmetendoTroca(false);
    }
  };

  const enfermeirosFiltrados = enfermeiros.filter((enf) => {
    const termo = searchTerm.toLowerCase();
    const nome = enf.nome?.toLowerCase() || "";
    const email = enf.email?.toLowerCase() || "";
    return nome.includes(termo) || email.includes(termo);
  });

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
    return turnos.filter((t) => {
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
    return "bg-emerald-500";
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 text-slate-800 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meu Horário</h1>
        <p className="text-xs text-slate-400">Consulte os seus turnos atribuídos e escalas profissionais</p>
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
      {(viewMode === "lista" ? turnos : (diaSelecionado ? getTurnosDoDia(diaSelecionado) : [])).length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-6">Não tem turnos agendados para este período.</p>
      ) : (
        <div className="space-y-3">
          {viewMode === "calendario" && diaSelecionado && (
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Turnos no dia {diaSelecionado} de {currentDate.toLocaleString("pt-PT", { month: "long" })}
            </h2>
          )}

          {(viewMode === "lista" ? turnos : getTurnosDoDia(diaSelecionado!)).map((turno) => {
            const isConcluido = turno.estado === "CONCLUIDO";

            return (
              <div
                key={turno.id}
                onClick={() => setTurnoDetalhe(turno)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isConcluido
                    ? "bg-blue-50/60 border-blue-200 hover:border-blue-400"
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
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      Atribuído
                    </span>
                  )}
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

      {/* MODAL DE DETALHES DO TURNO */}
      {turnoDetalhe && !modalTrocaAberto && (
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

            <div className="pt-4 border-t border-slate-100 space-y-2">
              {turnoDetalhe.estado !== "CONCLUIDO" && (
                <button
                  onClick={abrirModalTroca}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 border border-emerald-200 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Substituir Turno (Trocar com Colega)
                </button>
              )}

              <button
                onClick={() => setTurnoDetalhe(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl text-xs transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE ENFERMEIRO PARA A TROCA */}
      {modalTrocaAberto && turnoDetalhe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Substituir Turno</h3>
                <p className="text-[11px] text-slate-500">
                  {turnoDetalhe.instituicao.nome} - {new Date(turnoDetalhe.data).toLocaleDateString("pt-PT")}
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
                Selecione o enfermeiro (colega) para realizar a troca:
              </label>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                disabled={submetendoTroca || !enfermeiroSelecionado}
                className="flex-1 py-3 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-2xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submetendoTroca ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirmar Troca"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}