"use client";

import { useState, useEffect } from "react";
import { Search, UserCheck, X, RefreshCw } from "lucide-react";

interface Enfermeiro {
  id: string;
  nome: string;
  email: string;
}

interface ModalTrocaTurnoProps {
  turnoId: string;
  instituicaoNome: string;
  dataTurno: string;
  onClose: () => void;
  onSucesso: () => void;
}

export default function ModalTrocaTurno({
  turnoId,
  instituicaoNome,
  dataTurno,
  onClose,
  onSucesso,
}: ModalTrocaTurnoProps) {
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [enfermeiroSelecionado, setEnfermeiroSelecionado] = useState<string>("");
  const [loadingDados, setLoadingDados] = useState(true);
  const [submetendo, setSubmetendo] = useState(false);

  useEffect(() => {
    async function carregarEnfermeiros() {
      try {
        setLoadingDados(true);
        const res = await fetch("/api/admin/enfermeiros");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setEnfermeiros(data);
        }
      } catch (err) {
        console.error("Erro ao carregar enfermeiros:", err);
      } finally {
        setLoadingDados(false);
      }
    }
    carregarEnfermeiros();
  }, []);

  const enfermeirosFiltrados = enfermeiros.filter((enf) => {
    const termo = searchTerm.toLowerCase();
    const nome = enf.nome?.toLowerCase() || "";
    const email = enf.email?.toLowerCase() || "";
    return nome.includes(termo) || email.includes(termo);
  });

  const handleTroca = async () => {
    if (!enfermeiroSelecionado) {
      alert("Por favor selecione o enfermeiro para quem quer transferir o turno.");
      return;
    }

    setSubmetendo(true);
    try {
      const res = await fetch(`/api/turnos/${turnoId}/trocar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novoEnfermeiroId: enfermeiroSelecionado }),
      });

      if (res.ok) {
        alert("Troca de turno efetuada com sucesso!");
        onSucesso();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao efetuar a troca de turno.");
      }
    } catch (err) {
      alert("Erro ao comunicar com o servidor.");
    } finally {
      setSubmetendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Substituir Turno</h3>
            <p className="text-xs text-slate-500">
              {instituicaoNome} - {new Date(dataTurno).toLocaleDateString("pt-PT")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Selecione o enfermeiro que o vai substituir:
          </label>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-100 p-2 rounded-2xl">
            {loadingDados ? (
              <p className="text-xs text-slate-400 text-center py-4">A carregar enfermeiros...</p>
            ) : enfermeirosFiltrados.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum enfermeiro encontrado.</p>
            ) : (
              enfermeirosFiltrados.map((enf) => (
                <div
                  key={enf.id}
                  onClick={() => setEnfermeiroSelecionado(enf.id)}
                  className={`p-3 rounded-xl border text-xs flex justify-between items-center cursor-pointer transition-all ${
                    enfermeiroSelecionado === enf.id
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold"
                      : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{enf.nome || "Sem Nome"}</p>
                    <p className="text-[10px] text-slate-400">{enf.email}</p>
                  </div>
                  {enfermeiroSelecionado === enf.id && (
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleTroca}
            disabled={submetendo || !enfermeiroSelecionado}
            className="flex-1 py-3 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-2xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {submetendo ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              "Confirmar Troca"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}