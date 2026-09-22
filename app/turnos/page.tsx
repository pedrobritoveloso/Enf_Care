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
  Play,
  Square
} from "lucide-react";

interface Turno {
  id: string;
  data: string; // ISO string ou YYYY-MM-DD
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
      utilizador?: {
        nome?: string;
        email?: string;
      };
    };
  }>;
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

export default function TurnosPage() {
  const [viewMode, setViewMode] = useState<"calendario" | "lista">("calendario");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(11); // Exemplo: dia 11 selecionado
  const [turnoDetalhe, setTurnoDetalhe] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");

  // Função para procurar turnos envelopada em useCallback
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
          console.warn("A resposta da API /api/turnos não é um Array:", data);
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

  // Fetch inicial ao carregar o componente
  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  // Atualização automática dos dados a cada 15 segundos
  useAutoRefresh(fetchTurnos, 15000);

  // Filtragem de turnos por pesquisa e estado
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

  const handleAceitarTurno = async (turnoId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/turnos/${turnoId}/inscrever`, {
        method: "POST",
      });

      if (res.ok) {
        alert("Candidatura/Aceitação submetida com sucesso!");
        setTurnoDetalhe(null);
        fetchTurnos();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao aceitar o turno.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistarPonto = async (turnoId: string, acao: "CHECK_IN" | "CHECK_OUT") => {
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
      const res = await fetch(`/api/turnos/${turnoId}/ponto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, lat, lon }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Ponto registado com sucesso!");
        setTurnoDetalhe(null);
        fetchTurnos();
      } else {
        alert(data.error || "Erro ao registar ponto.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de ligação ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Agrupar turnos por dia do mês (setembro 2026)
  const getTurnosDoDia = (dia: number) => {
    return turnosFiltrados.filter((t) => {
      if (!t?.data) return false;
      const d = new Date(t.data);
      return d.getDate() === dia;
    });
  };

  // Determinar a cor da badge do dia no calendário
  const getCorBadgeDia = (dia: number) => {
    const turnosDoDia = getTurnosDoDia(dia);
    if (turnosDoDia.length === 0) return null;

    // Se houver turnos concluídos -> Azul
    const temConcluido = turnosDoDia.some((t) => t.estado === "CONCLUIDO");
    if (temConcluido) return "bg-blue-500";

    // Se houver algum turno por atribuir -> Amarelo
    const temDisponivel = turnosDoDia.some(
      (t) => t.estado === "PUBLICADO" || t.estado === "AGUARDAR_ENFERMEIRO"
    );
    if (temDisponivel) return "bg-amber-400";

    // Se estiverem atribuídos -> Verde
    return "bg-emerald-500";
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 text-slate-800 pb-20">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Turnos Disponíveis</h1>
        <p className="text-xs text-slate-400">{turnosFiltrados.length} turnos encontrados</p>
      </div>

      {/* Alternador de Vista (Calendário / Lista) */}
      <div className="bg-slate-100 p-1 rounded-2xl flex text-xs font-semibold">
        <button
          onClick={() => setViewMode("calendario")}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
            viewMode === "calendario"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Calendário
        </button>
        <button
          onClick={() => setViewMode("lista")}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
            viewMode === "lista"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
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

        <div className="flex gap-2">
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 font-medium"
          >
            <option value="TODOS">Todos os estados</option>
            <option value="DISPONIVEIS">Disponíveis (Amarelo)</option>
            <option value="ATRIBUIDOS">Atribuídos (Verde)</option>
            <option value="CONCLUIDOS">Concluídos (Azul)</option>
          </select>
        </div>
      </div>

      {/* VISTA: CALENDÁRIO */}
      {viewMode === "calendario" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <CalendarIcon className="w-4 h-4 text-emerald-700" />
              <span>Setembro De 2026</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
                Hoje
              </button>
              <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grelha de Dias */}
          <div className="grid grid-cols-7 text-center gap-y-2 text-xs">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <span key={d} className="text-slate-400 font-medium pb-1">
                {d}
              </span>
            ))}

            {/* Dias de Setembro 2026 (Exemplo de 1 a 30) */}
            {Array.from({ length: 30 }, (_, i) => i + 1).map((dia) => {
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
                  
                  {/* Badge de estado (Azul / Amarelo / Verde) */}
                  {corBadgeClass && (
                    <span className={`w-2 h-2 rounded-full mt-0.5 ${corBadgeClass}`} />
                  )}
                </button>
              );
            })}
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
              Turnos no dia {diaSelecionado} de Setembro
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

                {/* Nome do Enfermeiro se já estiver atribuído */}
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

      {/* MODAL COM INFORMAÇÕES E REGISTO DE PONTO / INSCRIÇÃO */}
      {turnoDetalhe && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-5 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">Detalhes do Turno</h3>
              <button
                onClick={() => setTurnoDetalhe(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-400">Instituição</span>
                <span className="font-bold text-slate-800">{turnoDetalhe.instituicao.nome}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-400">Horário</span>
                <span className="font-bold text-slate-800">{turnoDetalhe.horaInicio} - {turnoDetalhe.horaFim}</span>
              </div>

              {/* Nome do Enfermeiro no Modal */}
              {turnoDetalhe.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome && (
                <div className="flex justify-between py-2 border-b bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-400">Enfermeiro Atribuído</span>
                  <span className="font-bold text-slate-900">
                    {turnoDetalhe.atribuicoes[0].enfermeiro.utilizador.nome}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-400">Estado</span>
                <span className={`font-bold ${
                  turnoDetalhe.estado === "CONCLUIDO"
                    ? "text-blue-600"
                    : turnoDetalhe.estado === "PUBLICADO" || turnoDetalhe.estado === "AGUARDAR_ENFERMEIRO"
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}>
                  {turnoDetalhe.estado === "CONCLUIDO"
                    ? "Concluído"
                    : turnoDetalhe.estado === "PUBLICADO" || turnoDetalhe.estado === "AGUARDAR_ENFERMEIRO"
                    ? "Disponível (Não Atribuído)"
                    : "Atribuído"}
                </span>
              </div>
            </div>

            {/* AÇÕES NO MODAL */}
            {turnoDetalhe.estado === "PUBLICADO" || turnoDetalhe.estado === "AGUARDAR_ENFERMEIRO" ? (
              <button
                disabled={loading}
                onClick={() => handleAceitarTurno(turnoDetalhe.id)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-2xl text-xs shadow-sm transition-all"
              >
                {loading ? "A processar..." : "Aceitar Turno"}
              </button>
            ) : turnoDetalhe.estado === "CONCLUIDO" ? (
              <div className="bg-blue-50 text-blue-800 p-3.5 rounded-2xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Este turno já se encontra concluído.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Validação dos 10 minutos para Check-in */}
                {turnoDetalhe.estado === "ATRIBUIDO" && !podeFazerCheckIn(turnoDetalhe.data, turnoDetalhe.horaInicio, turnoDetalhe.horaFim) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-2xl font-medium text-center">
                    O check-in só fica disponível <strong>10 minutos antes</strong> do início do turno.
                  </div>
                )}

                {turnoDetalhe.estado === "ATRIBUIDO" && (
                  <button
                    disabled={!podeFazerCheckIn(turnoDetalhe.data, turnoDetalhe.horaInicio, turnoDetalhe.horaFim) || loading}
                    onClick={() => handleRegistarPonto(turnoDetalhe.id, "CHECK_IN")}
                    className={`w-full font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all ${
                      podeFazerCheckIn(turnoDetalhe.data, turnoDetalhe.horaInicio, turnoDetalhe.horaFim) && !loading
                        ? "bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm cursor-pointer"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {loading ? "A registar..." : "Fazer Check-in (Iniciar Turno)"}
                  </button>
                )}

                {turnoDetalhe.estado === "EM_CURSO" && (
                  <button
                    disabled={loading}
                    onClick={() => handleRegistarPonto(turnoDetalhe.id, "CHECK_OUT")}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    {loading ? "A registar..." : "Fazer Check-out (Terminar Turno)"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}