"use client";

import { useState, useEffect } from "react";
import { 
  Euro, 
  Sun, 
  Moon, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  TrendingUp, 
  Sparkles,
  Clock
} from "lucide-react";

interface EpocaEspecial {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
}

interface ResumoFinanceiro {
  receitaTotal: number;
  totalHoras: number;
  horasPorEnfermeiro: Array<{ nome: string; totalHoras: number }>;
  porInstituicao: Array<{ nome: string; totalTurnos: number; receitaTotal: number }>;
}

export default function ReceitaPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estado do Mês Selecionado
  const [mesSelecionado, setMesSelecionado] = useState(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );

  // Tarifas
  const [tarifas, setTarifas] = useState({
    valorDiurno: "12.00",
    valorNoturno: "15.00",
    valorEspecial: "18.00",
  });

  // Épocas Especiais
  const [epocas, setEpocas] = useState<EpocaEspecial[]>([]);
  const [novaEpoca, setNovaEpoca] = useState({
    nome: "",
    dataInicio: "",
    dataFim: "",
  });

  // Resumo Financeiro e Faturação
  const [resumo, setResumo] = useState<ResumoFinanceiro>({
    receitaTotal: 0,
    totalHoras: 0,
    horasPorEnfermeiro: [],
    porInstituicao: [],
  });

  useEffect(() => {
    carregarDados();
  }, [mesSelecionado]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resConfig, resEpocas, resResumo] = await Promise.all([
        fetch("/api/admin/receita/configuracao"),
        fetch("/api/admin/receita/epocas"),
        fetch(`/api/admin/receita?mes=${mesSelecionado}`),
      ]);

      if (resConfig.ok) {
        const dataConfig = await resConfig.json();
        setTarifas({
          valorDiurno: dataConfig.valorDiurno?.toString() || "12.00",
          valorNoturno: dataConfig.valorNoturno?.toString() || "15.00",
          valorEspecial: dataConfig.valorEspecial?.toString() || "18.00",
        });
      }

      if (resEpocas.ok) {
        const dataEpocas = await resEpocas.json();
        if (Array.isArray(dataEpocas)) setEpocas(dataEpocas);
      }

      if (resResumo.ok) {
        const dataResumo = await resResumo.json();
        setResumo(dataResumo);
      }
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarTarifas = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const res = await fetch("/api/admin/receita/configuracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tarifas),
      });

      if (res.ok) {
        alert("Tarifas atualizadas com sucesso!");
      } else {
        alert("Erro ao guardar tarifas.");
      }
    } catch (err) {
      alert("Erro de comunicação com o servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const handleAdicionarEpoca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaEpoca.nome || !novaEpoca.dataInicio || !novaEpoca.dataFim) {
      alert("Por favor preencha todos os campos da época especial.");
      return;
    }

    try {
      const res = await fetch("/api/admin/receita/epocas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novaEpoca),
      });

      if (res.ok) {
        setNovaEpoca({ nome: "", dataInicio: "", dataFim: "" });
        carregarDados();
      } else {
        alert("Erro ao criar época especial.");
      }
    } catch (err) {
      alert("Erro ao comunicar com o servidor.");
    }
  };

  const handleRemoverEpoca = async (id: string) => {
    if (!confirm("Tem a certeza de que pretende eliminar esta época especial?")) return;

    try {
      const res = await fetch(`/api/admin/receita/epocas?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        carregarDados();
      } else {
        alert("Erro ao eliminar.");
      }
    } catch (err) {
      alert("Erro de comunicação.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-slate-400 py-20">
        A carregar definições financeiras...
      </div>
    );
  }

  return (
    <div className="max-w-md md:max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Euro className="w-7 h-7 text-emerald-600" /> Receita & Remunerações
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure a tabela de valores/hora por regime de horário e épocas festivas
        </p>
      </div>

      {/* PAINEL DE TARIFAS BASE (EM LINHAS HORIZONTAIS) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Regras de Valor/Hora (€/h)</span>
        </div>

        <form onSubmit={handleGuardarTarifas} className="space-y-4">
          <div className="space-y-3">
            {/* Dias Úteis (Diurno) */}
            <div className="p-3.5 rounded-2xl border border-amber-200/70 bg-amber-50/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">Dias Úteis (Diurno)</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Segunda a Sexta • 08:00 às 20:00</p>
              </div>

              <div className="relative shrink-0 w-28">
                <input
                  type="number"
                  step="0.5"
                  required
                  value={tarifas.valorDiurno}
                  onChange={(e) => setTarifas({ ...tarifas, valorDiurno: e.target.value })}
                  className="w-full p-2.5 pr-7 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
                />
                <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">€/h</span>
              </div>
            </div>

            {/* Dias Úteis (Noturno) */}
            <div className="p-3.5 rounded-2xl border border-indigo-200/70 bg-indigo-50/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                  <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="truncate">Dias Úteis (Noturno)</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Segunda a Sexta • 20:00 às 08:00</p>
              </div>

              <div className="relative shrink-0 w-28">
                <input
                  type="number"
                  step="0.5"
                  required
                  value={tarifas.valorNoturno}
                  onChange={(e) => setTarifas({ ...tarifas, valorNoturno: e.target.value })}
                  className="w-full p-2.5 pr-7 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
                />
                <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">€/h</span>
              </div>
            </div>

            {/* Fins de Semana & Épocas */}
            <div className="p-3.5 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Fins de Semana & Épocas</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Sábados, Domingos e Feriados</p>
              </div>

              <div className="relative shrink-0 w-28">
                <input
                  type="number"
                  step="0.5"
                  required
                  value={tarifas.valorEspecial}
                  onChange={(e) => setTarifas({ ...tarifas, valorEspecial: e.target.value })}
                  className="w-full p-2.5 pr-7 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                />
                <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">€/h</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {guardando ? "A guardar..." : "Guardar Alterações"}
            </button>
          </div>
        </form>
      </div>

      {/* PAINEL DE ÉPOCAS ESPECIAIS & FERIADOS */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Épocas Especiais / Feriados</span>
          </div>
        </div>

        {/* Form para Adicionar Época */}
        <form onSubmit={handleAdicionarEpoca} className="bg-slate-50 p-3.5 rounded-2xl space-y-3 border border-slate-100">
          <span className="block text-xs font-semibold text-slate-700">Nova Época Especial</span>
          <div className="grid grid-cols-1 gap-2.5">
            <input
              type="text"
              placeholder="Nome (Ex: Natal / Ano Novo)"
              value={novaEpoca.nome}
              onChange={(e) => setNovaEpoca({ ...novaEpoca, nome: e.target.value })}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={novaEpoca.dataInicio}
                onChange={(e) => setNovaEpoca({ ...novaEpoca, dataInicio: e.target.value })}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="date"
                value={novaEpoca.dataFim}
                onChange={(e) => setNovaEpoca({ ...novaEpoca, dataFim: e.target.value })}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Adicionar Época Especial
          </button>
        </form>

        {/* Lista de Épocas */}
        <div className="space-y-2">
          {epocas.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4">
              Nenhuma época especial registada.
            </p>
          ) : (
            epocas.map((ep) => (
              <div
                key={ep.id}
                className="p-3 bg-slate-50/60 border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
              >
                <div>
                  <strong className="text-slate-800 block">{ep.nome}</strong>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(ep.dataInicio).toLocaleDateString("pt-PT")} até{" "}
                    {new Date(ep.dataFim).toLocaleDateString("pt-PT")}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoverEpoca(ep.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PAINEL DE RESUMO FINANCEIRO E FATURAÇÃO COM SELETOR DE MÊS */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Euro className="w-4 h-4 text-emerald-600" />
            <span>Resumo Financeiro e Faturação</span>
          </div>

          {/* Seletor de Mês posicionado na secção de Resumo */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Cards de Métricas de Receita */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-emerald-800 font-medium">Receita Total Acumulada</p>
              <h3 className="text-xl font-black text-emerald-950 mt-0.5">
                {resumo.receitaTotal?.toFixed(2) ?? "0.00"} €
              </h3>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-blue-800 font-medium">Total de Horas Registadas</p>
              <h3 className="text-xl font-black text-blue-950 mt-0.5">
                {resumo.totalHoras?.toFixed(2) ?? "0.00"} h
              </h3>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-800">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total de Horas Trabalhadas por Enfermeiro */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-700">Total de Horas por Enfermeiro</h4>
          <div className="max-h-44 overflow-y-auto space-y-2 border border-slate-100 p-2 rounded-2xl bg-slate-50/50">
            {!resumo.horasPorEnfermeiro || resumo.horasPorEnfermeiro.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Sem registos de horas por enfermeiro.</p>
            ) : (
              resumo.horasPorEnfermeiro.map((enf, index) => (
                <div key={index} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                  <span className="font-semibold text-slate-800">{enf.nome}</span>
                  <span className="font-bold text-emerald-800">{enf.totalHoras.toFixed(2)} horas</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tabela de Relatório de Custos/Ganhos por Instituição */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-700">Relatório por Instituição</h4>
          <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-3 font-semibold">Instituição</th>
                  <th className="p-3 font-semibold text-center">Turnos Realizados</th>
                  <th className="p-3 font-semibold text-right">Receita Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {!resumo.porInstituicao || resumo.porInstituicao.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                      Sem dados financeiros por instituição.
                    </td>
                  </tr>
                ) : (
                  resumo.porInstituicao.map((inst, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-medium text-slate-900">{inst.nome}</td>
                      <td className="p-3 text-center">{inst.totalTurnos}</td>
                      <td className="p-3 text-right font-bold text-emerald-800">{inst.receitaTotal.toFixed(2)} €</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}