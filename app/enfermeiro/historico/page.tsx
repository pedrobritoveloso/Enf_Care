"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, MapPin, CheckCircle2, FileText, Award } from "lucide-react";

interface HistoricoItem {
  id: string;
  entradaReal: string;
  saidaReal: string;
  horasContabilizadas: number;
  turno: {
    data: string;
    horaInicio: string;
    horaFim: string;
    valorHora?: number;
    instituicao: {
      nome: string;
      morada?: string;
    };
  };
}

export default function HistoricoEnfermeiroPage() {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistorico() {
      try {
        const res = await fetch("/api/enfermeiro/historico");
        if (res.ok) {
          const data = await res.json();
          setHistorico(data.historico || []);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistorico();
  }, []);

  const totalHoras = historico.reduce((acc, item) => acc + (item.horasContabilizadas || 0), 0);
  const totalTurnos = historico.length;
  const totalGanhoEstimado = historico.reduce((acc, item) => {
    const valorHora = item.turno.valorHora || 0;
    return acc + (item.horasContabilizadas || 0) * valorHora;
  }, 0);

  const formatHora = (dateStr: string) => {
    if (!dateStr) return "--:--";
    try {
      return new Date(dateStr).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "--:--";
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">A carregar histórico...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 pb-20">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Histórico e Extrato</h1>
        <p className="text-xs text-slate-400">Registo consolidado de turnos e assiduidade</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <p className="text-[11px] text-slate-400 font-medium">Total de Horas</p>
          <div className="flex items-center gap-1.5 text-slate-900 font-black text-lg">
            <Clock className="w-4 h-4 text-emerald-600"/>
            <span>{totalHoras.toFixed(2)}h</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <p className="text-[11px] text-slate-400 font-medium">Turnos Realizados</p>
          <div className="flex items-center gap-1.5 text-slate-900 font-black text-lg">
            <Award className="w-4 h-4 text-emerald-600"/>
            <span>{totalTurnos}</span>
          </div>
        </div>
      </div>

      {totalGanhoEstimado > 0 && (
        <div className="bg-emerald-800 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-200 font-medium">Valor Estimado Acumulado</p>
            <p className="text-xl font-black">{totalGanhoEstimado.toFixed(2)} €</p>
          </div>
          <FileText className="w-8 h-8 text-emerald-600/40"/>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Turnos Concluídos</h2>

        {historico.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
            Ainda não existem registos de assiduidade concluídos.
          </div>
        ) : (
          historico.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{item.turno.instituicao.nome}</h3>
                  {item.turno.instituicao.morada && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3"/> {item.turno.instituicao.morada}
                    </p>
                  )}
                </div>
                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3"/> {item.horasContabilizadas}h
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400"/>
                  <span>{new Date(item.turno.data).toLocaleDateString("pt-PT")}</span>
                </div>
                <div className="font-semibold text-slate-700">
                  {formatHora(item.entradaReal)} - {formatHora(item.saidaReal)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}