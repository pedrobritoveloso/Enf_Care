"use client";

import { useState, useEffect } from "react";
import { Printer, Calendar } from "lucide-react";

interface RelatorioItem {
  id: string;
  entradaReal: string;
  saidaReal: string;
  horasContabilizadas: number;
  enfermeiro: {
    utilizador: {
      nome: string;
      email: string;
    };
  };
  turno: {
    data: string;
    horaInicio: string;
    horaFim: string;
    valorHora?: number;
    instituicao: {
      nome: string;
    };
  };
}

export default function RelatoriosAdminPage() {
  const [mesSelecionado, setMesSelecionado] = useState(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );
  const [dados, setDados] = useState<RelatorioItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRelatorio() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/relatorios?mes=${mesSelecionado}`);
        if (res.ok) {
          const json = await res.json();
          setDados(json.assiduidades || []);
        }
      } catch (err) {
        console.error("Erro ao carregar relatório:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRelatorio();
  }, [mesSelecionado]);

  const totalHoras = dados.reduce((acc, item) => acc + (item.horasContabilizadas || 0), 0);
  const totalRegistos = dados.length;

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

  const dataEmissaoFormatada = new Date().toLocaleDateString("pt-PT");

  // Função que abre uma janela limpa e imprime exclusivamente o documento A4 formatado
  const handlePrintA4 = () => {
    const janelaImpressao = window.open("", "_blank");
    if (!janelaImpressao) {
      alert("Por favor, permita pop-ups para exportar o PDF.");
      return;
    }

    const htmlTabela = dados.length === 0 
      ? `<tr><td colspan="5" style="text-align: center; font-style: italic; color: #666; padding: 15px;">Sem registos para o período selecionado.</td></tr>`
      : dados.map(item => `
          <tr>
            <td style="border: 1px solid #000; padding: 8px 12px;">${new Date(item.turno.data).toLocaleDateString("pt-PT")}</td>
            <td style="border: 1px solid #000; padding: 8px 12px; font-weight: bold;">${item.turno.instituicao.nome}</td>
            <td style="border: 1px solid #000; padding: 8px 12px;">${item.enfermeiro.utilizador.nome}</td>
            <td style="border: 1px solid #000; padding: 8px 12px;">${formatHora(item.entradaReal)} – ${formatHora(item.saidaReal)}</td>
            <td style="border: 1px solid #000; padding: 8px 12px; font-weight: bold;">${item.horasContabilizadas}h</td>
          </tr>
        `).join("");

    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html lang="pt">
        <head>
          <meta charset="utf-8" />
          <title>Relatório - My EnfCare</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 20mm;
            }
            h1 {
              font-size: 20pt;
              font-weight: bold;
              margin: 0 0 25px 0;
            }
            .linha-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              font-size: 11pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px 12px;
              text-align: left;
              font-size: 11pt;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>My EnfCare - Folha de Horas e Assiduidade</h1>
          
          <div class="linha-info">
            <div><strong>Periodo de referencia:</strong> ${mesSelecionado}</div>
            <div><strong>Emitido em:</strong> ${dataEmissaoFormatada}</div>
          </div>

          <div class="linha-info" style="margin-bottom: 30px;">
            <div><strong>Turnos Concluidos:</strong> ${totalRegistos}</div>
            <div><strong>Horas Contabilizadas:</strong> ${totalHoras.toFixed(2)} horas</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Instituição</th>
                <th>Enfermeiro/a</th>
                <th>Entrada/Saída</th>
                <th>Horas</th>
              </tr>
            </thead>
            <tbody>
              ${htmlTabela}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    janelaImpressao.document.close();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      {/* ========================================================= */}
      {/* 1. PÁGINA NORMAL (TELEMÓVEL) - MANTIDA EXATAMENTE IGUAL    */}
      {/* ========================================================= */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Relatório Mensal de Assiduidade</h1>
          <p className="text-xs text-slate-400 mt-0.5">Fecho de mês, prestação de serviços e exportação A4</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handlePrintA4}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Exportar para PDF (A4)
          </button>
        </div>
      </div>

      {/* Pré-visualização na Página Web */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-lg font-black text-slate-900">MyEnfCare — Folha de Horas e Assiduidade</h2>
            <p className="text-xs text-slate-500 mt-0.5">Período de referência: <strong>{mesSelecionado}</strong></p>
          </div>
          <div className="text-xs text-slate-400">Emitido em: {dataEmissaoFormatada}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <p className="text-xs text-slate-500 font-medium">Turnos Concluídos</p>
            <p className="text-xl font-bold text-slate-900">{totalRegistos}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Horas Contabilizadas</p>
            <p className="text-xl font-bold text-emerald-800">{totalHoras.toFixed(2)}h</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-xs text-slate-400">A carregar dados do relatório...</div>
        ) : dados.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 italic">Nenhum registo de assiduidade encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-2">Data</th>
                  <th className="py-3 px-2">Instituição</th>
                  <th className="py-3 px-2">Enfermeiro</th>
                  <th className="py-3 px-2">Entrada / Saída</th>
                  <th className="py-3 px-2 text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-2 font-medium whitespace-nowrap">
                      {new Date(item.turno.data).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-900">
                      {item.turno.instituicao.nome}
                    </td>
                    <td className="py-3 px-2">
                      {item.enfermeiro.utilizador.nome}
                    </td>
                    <td className="py-3 px-2 font-medium text-slate-600 whitespace-nowrap">
                      {formatHora(item.entradaReal)} → {formatHora(item.saidaReal)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-emerald-800 whitespace-nowrap">
                      {item.horasContabilizadas}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}