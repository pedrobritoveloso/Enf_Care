"use client";

import { useState, useEffect } from "react";

interface Enfermeiro {
  id: string;
  utilizador: {
    nome: string;
  };
}

interface Instituicao {
  id: string;
  nome: string;
}

export default function AdminTurnosAtribuidos() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  
  // Form state
  const [instituicaoId, setInstituicaoId] = useState("");
  const [enfermeiroId, setEnfermeiroId] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [valorHora, setValorHora] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carregar instituições e enfermeiros para os dropdowns
    async function fetchData() {
      try {
        const [resInst, resEnf] = await Promise.all([
          fetch("/api/instituicoes"), // Adapta a rota se necessário
          fetch("/api/enfermeiro"),   // Adapta a rota se necessário
        ]);
        
        if (resInst.ok) {
          const dataInst = await resInst.json();
          setInstituicoes(dataInst);
        }
        if (resEnf.ok) {
          const dataEnf = await resEnf.json();
          setEnfermeiros(dataEnf);
        }
      } catch (err) {
        console.error("Erro ao carregar dados auxiliares:", err);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituicaoId,
          enfermeiroId, // Ao enviar o enfermeiroId, o backend define o estado como ATRIBUIDO
          data,
          horaInicio,
          horaFim,
          valorHora: valorHora ? parseFloat(valorHora) : null,
        }),
      });

      if (res.ok) {
        alert("Turno atribuído criado com sucesso!");
        // Limpar formulário
        setInstituicaoId("");
        setEnfermeiroId("");
        setData("");
        setHoraInicio("");
        setHoraFim("");
        setValorHora("");
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error || "Não foi possível criar o turno."}`);
      }
    } catch (error) {
      console.error("Erro na submissão:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-bold mb-4">Criar Turno em Escala (Atribuído)</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Instituição</label>
        <select
          value={instituicaoId}
          onChange={(e) => setInstituicaoId(e.target.value)}
          required
          className="w-full border rounded p-2"
        >
          <option value="">Selecione uma instituição</option>
          {instituicoes.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Enfermeiro</label>
        <select
          value={enfermeiroId}
          onChange={(e) => setEnfermeiroId(e.target.value)}
          required
          className="w-full border rounded p-2"
        >
          <option value="">Selecione um enfermeiro</option>
          {enfermeiros.map((enf) => (
            <option key={enf.id} value={enf.id}>
              {enf.utilizador?.nome || "Sem nome"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Data</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
          className="w-full border rounded p-2"
        />
      </div>

      <div className="flex gap-4">
        <div className="w-1/2">
          <label className="block text-sm font-medium mb-1">Hora de Início</label>
          <input
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>
        <div className="w-1/2">
          <label className="block text-sm font-medium mb-1">Hora de Fim</label>
          <input
            type="time"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Valor/Hora (€)</label>
        <input
          type="number"
          step="0.01"
          value={valorHora}
          onChange={(e) => setValorHora(e.target.value)}
          placeholder="Ex: 13.00"
          className="w-full border rounded p-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white font-medium py-2 rounded hover:bg-emerald-700 transition"
      >
        {loading ? "A criar..." : "Criar Turno em Escala"}
      </button>
    </form>
  );
}