"use client";

import { useEffect, useState } from "react";
import { Search, Mail, MoreHorizontal, UserX, X, ShieldCheck, Euro } from "lucide-react";

interface Enfermeiro {
  id: string;
  nome?: string;
  email: string;
  especialidade?: string;
  precoHora?: number;
  role?: string;
  ativo?: boolean;
}

export default function EnfermeirosList() {
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado para controlo do Modal de Edição
  const [selectedEnfermeiro, setSelectedEnfermeiro] = useState<Enfermeiro | null>(null);
  const [editRole, setEditRole] = useState("ENFERMEIRO");
  const [editPrecoHora, setEditPrecoHora] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  const fetchEnfermeiros = () => {
    setLoading(true);
    fetch("/api/admin/enfermeiros")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar enfermeiros");
        return res.json();
      })
      .then((data) => setEnfermeiros(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEnfermeiros();
  }, []);

  const openEditModal = (enf: Enfermeiro) => {
    setSelectedEnfermeiro(enf);
    setEditRole(enf.role || "ENFERMEIRO");
    setEditPrecoHora(enf.precoHora ?? 10);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnfermeiro) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/enfermeiros/${selectedEnfermeiro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          precoHora: Number(editPrecoHora),
        }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar dados");

      // Atualiza o estado local imediatamente
      setEnfermeiros((prev) =>
        prev.map((item) =>
          item.id === selectedEnfermeiro.id
            ? { ...item, role: editRole, precoHora: Number(editPrecoHora) }
            : item
        )
      );
      setSelectedEnfermeiro(null);
    } catch (err: any) {
      alert(err.message || "Ocorreu um erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const enfermeirosFiltrados = enfermeiros.filter((e) => {
    const termo = search.toLowerCase();
    return (
      e.nome?.toLowerCase().includes(termo) ||
      e.email.toLowerCase().includes(termo) ||
      e.especialidade?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Enfermeiros
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          {enfermeiros.length} enfermeiros registados
        </p>
      </div>

      {/* Campo de Pesquisa */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar enfermeiros..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-sm"
        />
      </div>

      {/* Lista de Cartões */}
      {loading ? (
        <div className="py-10 text-center text-slate-400 text-sm">
          A carregar enfermeiros...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600">
          {error}
        </div>
      ) : enfermeirosFiltrados.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
          <UserX className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-medium text-slate-600">Nenhum enfermeiro encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enfermeirosFiltrados.map((enf) => (
            <div
              key={enf.id}
              className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {enf.nome || "Sem nome definido"}
                    </h3>
                    {enf.role === "ADMIN" && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-md">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-emerald-600 mt-0.5">
                    {enf.especialidade || "Generalista"}
                  </p>
                </div>
                <button
                  onClick={() => openEditModal(enf)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-50 rounded-xl transition-colors"
                  title="Editar Enfermeiro"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{enf.email}</span>
              </div>

              <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg tracking-wider uppercase">
                  {enf.ativo !== false ? "ATIVO" : "INATIVO"}
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  €{(enf.precoHora ?? 10).toFixed(2)}/h
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição (Admin / Preço Hora) */}
      {selectedEnfermeiro && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Editar Utilizador
                </h3>
                <p className="text-xs text-slate-400">{selectedEnfermeiro.email}</p>
              </div>
              <button
                onClick={() => setSelectedEnfermeiro(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Função / Role */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  Cargo / Função
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                >
                  <option value="ENFERMEIRO">Enfermeiro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {/* Preço / Hora */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Euro className="w-4 h-4 text-slate-400" />
                  Valor por Hora (€)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={editPrecoHora}
                  onChange={(e) => setEditPrecoHora(Number(e.target.value))}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEnfermeiro(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-800/20 transition-all disabled:opacity-50"
                >
                  {saving ? "A guardar..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}