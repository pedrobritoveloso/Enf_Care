"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  FileText,
  MoreHorizontal,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Instituicao {
  id: string;
  nome: string;
  nif: string;
  morada: string;
  latitude?: number | null;
  longitude?: number | null;
  ativo: boolean;
}

export default function InstituicoesPage() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "create">("list");

  // Estado do formulário de criação
  const [formData, setFormData] = useState({
    nome: "",
    nif: "",
    morada: "",
    latitude: "",
    longitude: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Menu de opções (3 pontos) aberto
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Carregar instituições da API
  const fetchInstituicoes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/instituicoes");
      if (res.ok) {
        const data = await res.json();
        setInstituicoes(data);
      }
    } catch (err) {
      console.error("Erro ao carregar instituições", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstituicoes();
  }, []);

  // Alternar o estado Ativo/Inativo de uma instituição
  const handleToggleAtivo = async (inst: Instituicao) => {
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/admin/instituicoes/${inst.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !inst.ativo }),
      });

      if (res.ok) {
        setInstituicoes((prev) =>
          prev.map((item) =>
            item.id === inst.id ? { ...item, ativo: !inst.ativo } : item
          )
        );
      } else {
        alert("Erro ao alterar o estado da instituição.");
      }
    } catch (err) {
      alert("Erro ao conectar ao servidor.");
    }
  };

  // Guardar nova instituição
  const handleCreateSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    const res = await fetch("/api/admin/instituicoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: formData.nome,
        nif: formData.nif,
        morada: formData.morada,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setFormData({ nome: "", nif: "", morada: "", latitude: "", longitude: "" });
      setView("list");
      fetchInstituicoes();
    } else {
      alert(data.error || "Erro ao criar instituição");
    }
  } catch (err: any) {
    console.error("Erro na requisição:", err);
    alert("Erro de comunicação com o servidor: " + (err?.message || "Tenta novamente."));
  } finally {
    setSubmitting(false);
  }
};

  const filtradas = instituicoes.filter(
    (i) =>
      i.nome.toLowerCase().includes(search.toLowerCase()) ||
      i.nif.includes(search) ||
      i.morada.toLowerCase().includes(search.toLowerCase())
  );

  // ----------------------------------------------------
  // VISTA 2: FORMULÁRIO DE CRIAÇÃO (Print do utilizador)
  // ----------------------------------------------------
  if (view === "create") {
    return (
      <div className="max-w-md mx-auto py-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                Nova Instituição / Hospital
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Adicione uma nova entidade para alocação de turnos
              </p>
            </div>
            <button
              onClick={() => setView("list")}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          </div>

          <hr className="border-slate-100" />

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Nome da Instituição
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Hospital de São João"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* NIF */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                NIF (Número de Identificação Fiscal)
              </label>
              <input
                type="text"
                required
                placeholder="500123456"
                value={formData.nif}
                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Morada */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Morada Completa
              </label>
              <input
                type="text"
                required
                placeholder="Alameda Prof. Hernâni Monteiro, Porto"
                value={formData.morada}
                onChange={(e) => setFormData({ ...formData, morada: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Coordenadas (Latitude / Longitude) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Latitude (Opcional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="41.182"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Longitude (Opcional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="-8.601"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <hr className="border-slate-100 pt-1" />

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className="py-2.5 px-5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {submitting ? "A guardar..." : "Guardar Instituição"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VISTA 1: LISTAGEM DE INSTITUIÇÕES (Ecrã Normal)
  // ----------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Instituições
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          {instituicoes.length} entidades registadas
        </p>
      </div>

      {/* Botão para Nova Instituição */}
      <button
        onClick={() => setView("create")}
        className="bg-brand-800 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-2xl w-full flex items-center justify-center gap-2 shadow-md shadow-brand-800/20 transition-all text-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Nova Instituição</span>
      </button>

      {/* Pesquisa */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar instituição ou NIF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-sm"
        />
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="py-10 text-center text-slate-400 text-sm">
          A carregar instituições...
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-medium text-slate-600">
            Nenhuma instituição encontrada
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((inst) => (
            <div
              key={inst.id}
              className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {inst.nome}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>NIF: {inst.nif}</span>
                  </div>
                </div>

                {/* Botão de 3 Pontos com Menu Dropdown */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenMenuId(openMenuId === inst.id ? null : inst.id)
                    }
                    className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {openMenuId === inst.id && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={() => handleToggleAtivo(inst)}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors"
                      >
                        {inst.ativo ? (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-600">Desativar</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600">Ativar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-slate-500 pt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{inst.morada}</span>
              </div>

              <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                <span
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg tracking-wider uppercase ${
                    inst.ativo
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {inst.ativo ? "ATIVA" : "INATIVA"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}