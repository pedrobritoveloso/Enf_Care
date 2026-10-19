"use client";

import { useState, useEffect, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Bell, CheckCheck, Trash2, Clock, Filter } from "lucide-react";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
}

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [filtro, setFiltro] = useState<"todas" | "naoLidas">("todas");
  const [carregando, setCarregando] = useState(true);

  const fetchNotificacoes = useCallback(async () => {
    try {
      const res = await fetch("/api/notificacoes");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotificacoes(data);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificacoes();
  }, [fetchNotificacoes]);

  useAutoRefresh(fetchNotificacoes, 15000);

  const marcarTodasComoLidas = async () => {
    try {
      const res = await fetch("/api/notificacoes", { method: "PATCH" });
      if (res.ok) {
        setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      }
    } catch (err) {
      console.error("Erro ao marcar notificações:", err);
    }
  };

  const notificacoesFiltradas = notificacoes.filter((n) => {
    if (filtro === "naoLidas") return !n.lida;
    return true;
  });

  const naoLidasCount = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 text-slate-800 pb-20">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
          <p className="text-xs text-slate-400">
            {naoLidasCount > 0
              ? `Tem ${naoLidasCount} notificação(ões) não lida(s)`
              : "Todas as notificações estão lidas"}
          </p>
        </div>

        {naoLidasCount > 0 && (
          <button
            onClick={marcarTodasComoLidas}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-2 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-200"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Marcar lidas</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-slate-100 p-1 rounded-2xl flex text-xs font-semibold">
        <button
          onClick={() => setFiltro("todas")}
          className={`flex-1 py-2 rounded-xl text-center transition-all ${
            filtro === "todas"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Todas ({notificacoes.length})
        </button>
        <button
          onClick={() => setFiltro("naoLidas")}
          className={`flex-1 py-2 rounded-xl text-center transition-all ${
            filtro === "naoLidas"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Não Lidas ({naoLidasCount})
        </button>
      </div>

      {/* Lista de Notificações */}
      {carregando ? (
        <p className="text-xs text-slate-400 text-center py-8">A carregar notificações...</p>
      ) : notificacoesFiltradas.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
          <Bell className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-medium text-slate-600">Sem notificações para apresentar.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notificacoesFiltradas.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all ${
                n.lida
                  ? "bg-white border-slate-200"
                  : "bg-emerald-50/60 border-emerald-200 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-slate-900 text-xs">{n.titulo}</h3>
                {!n.lida && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0 mt-1" />
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.mensagem}</p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Clock className="w-3 h-3" />
                <span>{new Date(n.criadoEm).toLocaleString("pt-PT")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}