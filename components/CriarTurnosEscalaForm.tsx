"use client";

import { useState, useEffect } from "react";

interface Instituicao {
  id: string;
  nome: string;
}

interface Enfermeiro {
  id: string;
  nome?: string;
  email: string;
}

// Lista de horas em formato 24h rigoroso (de hora em hora ou de meia em meia hora se preferires)
const HORAS_24H = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return [`${h}:00`, `${h}:30`];
}).flat();

export default function CriarTurnoEscalaForm() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  const [formData, setFormData] = useState({
    instituicaoId: "",
    enfermeiroId: "",
    data: "",
    horaInicio: "08:00",
    horaFim: "20:00",
    vagas: "1",
  });

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoadingDados(true);
        const [resInst, resEnf] = await Promise.all([
          fetch("/api/instituicoes"),
          fetch("/api/admin/enfermeiros"),
        ]);

        if (resInst.ok) {
          const dataInst = await resInst.json();
          if (Array.isArray(dataInst)) setInstituicoes(dataInst);
        }

        if (resEnf.ok) {
          const dataEnf = await resEnf.json();
          if (Array.isArray(dataEnf)) setEnfermeiros(dataEnf);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoadingDados(false);
      }
    }

    carregarDados();
  }, []);

  const enfermeirosFiltrados = enfermeiros.filter((enf) => {
    const termo = searchTerm.toLowerCase();
    const nome = enf.nome?.toLowerCase() || "";
    const email = enf.email?.toLowerCase() || "";
    return nome.includes(termo) || email.includes(termo);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.enfermeiroId) {
      alert("Por favor selecione um enfermeiro da lista.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("Turno em escala atribuído com sucesso! Remuneração calculada automaticamente.");
        setFormData({
          instituicaoId: "",
          enfermeiroId: "",
          data: "",
          horaInicio: "08:00",
          horaFim: "20:00",
          vagas: "1",
        });
        setSearchTerm("");
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao atribuir turno");
      }
    } catch (error) {
      alert("Erro de ligação ao servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      {/* Instituição */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Instituição / Hospital</label>
        <select
          required
          value={formData.instituicaoId}
          onChange={(e) => setFormData({ ...formData, instituicaoId: e.target.value })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
        >
          <option value="">Selecione a instituição...</option>
          {instituicoes.map((inst) => (
            <option key={inst.id} value={inst.id}>{inst.nome}</option>
          ))}
        </select>
      </div>

      {/* Enfermeiro Atribuído */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Enfermeiro Atribuído</label>
        <input
          type="text"
          placeholder="Pesquisar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm mb-2"
        />
        <select
          required
          value={formData.enfermeiroId}
          onChange={(e) => setFormData({ ...formData, enfermeiroId: e.target.value })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
        >
          <option value="">
            {loadingDados
              ? "A carregar enfermeiros..."
              : enfermeirosFiltrados.length === 0
              ? "Nenhum enfermeiro encontrado"
              : "Selecione o enfermeiro..."}
          </option>
          {enfermeirosFiltrados.map((enf) => (
            <option key={enf.id} value={enf.id}>
              {enf.nome ? `${enf.nome} (${enf.email})` : enf.email}
            </option>
          ))}
        </select>
      </div>

      {/* Data do Turno */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Data do Turno</label>
        <input
          type="date"
          required
          value={formData.data}
          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
        />
      </div>

      {/* Horas (Formato 24h) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Início</label>
          <select
            required
            value={formData.horaInicio}
            onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
          >
            {HORAS_24H.map((h) => (
              <option key={`escala-ini-${h}`} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Fim</label>
          <select
            required
            value={formData.horaFim}
            onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
          >
            {HORAS_24H.map((h) => (
              <option key={`escala-fim-${h}`} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vagas */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Vagas</label>
        <input
          type="number"
          min="1"
          value={formData.vagas}
          onChange={(e) => setFormData({ ...formData, vagas: e.target.value })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading || enfermeiros.length === 0}
        className="w-full py-3.5 bg-teal-800 text-white font-bold rounded-2xl hover:bg-teal-900 transition-all shadow-md disabled:opacity-50"
      >
        {loading ? "A atribuir..." : "Atribuir Turno em Escala"}
      </button>
    </form>
  );
}