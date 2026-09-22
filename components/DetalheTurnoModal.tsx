"use client";

import { useState } from "react";
import { X, Calendar, Clock, MapPin, User, AlertCircle, Play, Square, Trash2, UserMinus } from "lucide-react";
import { podeFazerCheckIn, getEstiloEstadoTurno } from "@/lib/turnosUtils";

interface Turno {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  estado?: string;
  instituicao: { nome: string; morada?: string };
  atribuicoes?: Array<{
    enfermeiro: {
      utilizador: { nome: string; email: string };
    };
  }>;
}

interface DetalheTurnoModalProps {
  turno: Turno;
  onClose: () => void;
  onPontoSuccess?: () => void; // Callback acionado após check-in/out, remoção de enfermeiro ou eliminação
  isAdmin?: boolean; // Define se ativa as ações de administração
}

export default function DetalheTurnoModal({
  turno,
  onClose,
  onPontoSuccess,
  isAdmin = false,
}: DetalheTurnoModalProps) {
  const [processando, setProcessando] = useState(false);

  // Extrai o nome do enfermeiro se o turno estiver atribuído
  const enfermeiroAtribuido = turno.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome;

  // Validação da janela de 10 minutos antes do início
  const checkInPermitido = podeFazerCheckIn(turno.data, turno.horaInicio, turno.horaFim);

  // --- HANDLERS PARA O ENFERMEIRO ---
  const handleRegistarPonto = async (acao: "CHECK_IN" | "CHECK_OUT") => {
    setProcessando(true);

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
        alert(data.message || "Ponto registado com sucesso!");
        if (onPontoSuccess) onPontoSuccess();
        onClose();
      } else {
        alert(data.error || "Erro ao registar ponto.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setProcessando(false);
    }
  };

  // --- HANDLERS PARA O ADMIN ---
  const handleDesassociarEnfermeiro = async () => {
  if (
    !confirm(
      "Tem a certeza que deseja remover o enfermeiro deste turno? O turno ficará novamente disponível."
    )
  ) {
    return;
  }

  setProcessando(true);
  try {
    // Rota corrigida tirando o /admin/ do caminho:
    const res = await fetch(`/api/turnos/${turno.id}/desassociar`, {
      method: "POST",
    });

    if (res.ok) {
      alert("Enfermeiro removido com sucesso!");
      if (onPontoSuccess) onPontoSuccess();
      onClose();
    } else {
      const data = await res.json();
      alert(data.error || "Erro ao remover enfermeiro.");
    }
  } catch (err) {
    console.error(err);
    alert("Erro de comunicação com o servidor.");
  } finally {
    setProcessando(false);
  }
};

  const handleEliminarTurno = async () => {
    if (
      !confirm("Tem a certeza que deseja ELIMINAR permanentemente este turno?")
    ) {
      return;
    }

    setProcessando(true);
    try {
      const res = await fetch(`/api//turnos/${turno.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Turno eliminado com sucesso!");
        if (onPontoSuccess) onPontoSuccess();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao eliminar turno.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-xl border border-slate-100">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b pb-3 border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{turno.instituicao.nome}</h3>
            {turno.instituicao.morada && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {turno.instituicao.morada}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informações do Horário e Estado */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date(turno.data).toLocaleDateString("pt-PT")}</span>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getEstiloEstadoTurno(turno.estado)}`}>
              {turno.estado || "PUBLICADO"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700 font-semibold pt-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{turno.horaInicio} - {turno.horaFim}</span>
          </div>
        </div>

        {/* Informação do Enfermeiro Atribuído */}
        {enfermeiroAtribuido ? (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-800 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Enfermeiro Atribuído</span>
              <span className="font-bold text-slate-900 text-xs">{enfermeiroAtribuido}</span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100 text-xs text-amber-800 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Turno disponível (Ainda não foi atribuído a nenhum enfermeiro).</span>
          </div>
        )}

        {/* SECÇÃO DE AÇÕES */}
        {isAdmin ? (
          /* AÇÕES EXCLUSIVAS DO ADMIN */
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {enfermeiroAtribuido && (
              <button
                disabled={processando}
                onClick={handleDesassociarEnfermeiro}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <UserMinus className="w-4 h-4" />
                {processando ? "A processar..." : "Remover Enfermeiro (Tornar Disponível)"}
              </button>
            )}

            <button
              disabled={processando}
              onClick={handleEliminarTurno}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {processando ? "A processar..." : "Eliminar Turno Permanentemente"}
            </button>
          </div>
        ) : (
          /* AÇÕES DO ENFERMEIRO (PONTO/CHECK-IN/CHECK-OUT) */
          turno.estado === "CONCLUIDO" ? (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold rounded-2xl text-center">
              Este turno já foi concluído.
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {turno.estado === "ATRIBUIDO" && !checkInPermitido && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-2xl font-medium text-center">
                  O check-in só fica disponível <strong>10 minutos antes</strong> do início do turno.
                </div>
              )}

              {turno.estado === "ATRIBUIDO" && (
                <button
                  disabled={!checkInPermitido || processando}
                  onClick={() => handleRegistarPonto("CHECK_IN")}
                  className={`w-full font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all ${
                    checkInPermitido && !processando
                      ? "bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm cursor-pointer active:scale-[0.99]"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {processando ? "A registar..." : "Fazer Check-in"}
                </button>
              )}

              {turno.estado === "EM_CURSO" && (
                <button
                  disabled={processando}
                  onClick={() => handleRegistarPonto("CHECK_OUT")}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                >
                  <Square className="w-4 h-4 fill-current" />
                  {processando ? "A registar..." : "Fazer Check-out (Concluir Turno)"}
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}