"use client";

import { useState, useEffect } from "react";

interface Instituicao {
  id: string;
  nome: string;
}

interface CriarTurnoDisponivelFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function CriarTurnoDisponivelForm({ 
  onClose, 
  onSuccess 
}: CriarTurnoDisponivelFormProps) {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  const [formData, setFormData] = useState({
    instituicaoId: "",
    data: "",
    horaInicio: "08:00",
    horaFim: "20:00",
    valorHora: "",
    vagas: "1",
  });

  useEffect(() => {
    async function carregarInstituicoes() {
      try {
        setLoadingDados(true);
        const res = await fetch("/api/instituicoes");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setInstituicoes(data);
        }
      } catch (err) {
        console.error("Erro ao carregar instituições:", err);
      }finally {
        setLoadingDados(false);
      }
    }

    carregarInstituicoes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("Turno publicado com sucesso!");
        setFormData({
          instituicaoId: "",
          data: "",
          horaInicio: "08:00",
          horaFim: "20:00",
          valorHora: "",
          vagas: "1",
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao publicar turno");
      }
    } catch (error) {
      alert("Erro de ligação ao servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white space-y-4">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Publicar Turno Disponível
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Crie um turno aberto na bolsa para candidatura de qualquer enfermeiro
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Instituição / Hospital */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Instituição / Hospital
          </label>
          <select
            required
            value={formData.instituicaoId}
            onChange={(e) => setFormData({ ...formData, instituicaoId: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5D]"
          >
            <option value="">
              {loadingDados ? "A carregar instituições..." : "Selecione a instituição..."}
            </option>
            {instituicoes.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Data do Turno */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Data do Turno
          </label>
          <input
            type="date"
            required
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5D]"
          />
        </div>

        {/* Hora Início e Hora Fim */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hora Início
            </label>
            <input
              type="time"
              required
              value={formData.horaInicio}
              onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5D]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hora Fim
            </label>
            <input
              type="time"
              required
              value={formData.horaFim}
              onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5D]"
            />
          </div>
        </div>

        {/* Valor/Hora e Vagas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor/Hora (€)
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="Ex: 12.5"
              value={formData.valorHora}
              onChange={(e) => setFormData({ ...formData, valorHora: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5D]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vagas
            </label>
            <input
              type="number"
              min="1"
              value={formData.vagas}
              onChange={(e) => setFormData({ ...formData, vagas: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5D]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-xs"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`py-3.5 bg-[#006B5D] text-white font-bold rounded-2xl hover:bg-[#005449] transition-all shadow-md disabled:opacity-50 text-xs ${
              onClose ? "w-2/3" : "w-full"
            }`}
          >
            {loading ? "A publicar..." : "Publicar Turno"}
          </button>
        </div>
      </form>
    </div>
  );
}