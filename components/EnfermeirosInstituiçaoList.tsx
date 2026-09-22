"use client";

import { useEffect, useState } from "react";
import { Building2, Search, MapPin, FileText } from "lucide-react";

interface Instituicao {
  id: string;
  nome: string;
  nif: string;
  morada: string;
  latitude?: number | null;
  longitude?: number | null;
  ativo: boolean;
}

export default function EnfermeiroInstituicoesList() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchInstituicoes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/enfermeiro/instituicoes");
      if (res.ok) {
        const data = await res.json();
        setInstituicoes(data);
      }
    } catch (err) {
      console.error("Erro ao carregar instituições:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstituicoes();
  }, []);

  const filtradas = instituicoes.filter((i) => {
    const query = search.toLowerCase();
    const nome = i.nome ? i.nome.toLowerCase() : "";
    const nif = i.nif ? i.nif.toString() : "";
    const morada = i.morada ? i.morada.toLowerCase() : "";

    return nome.includes(query) || nif.includes(query) || morada.includes(query);
  });

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Instituições
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          {filtradas.length} entidades disponíveis
        </p>
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar instituição ou morada..."
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
              className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-2.5 relative"
            >
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {inst.nome}
                </h3>
                {inst.nif && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>NIF: {inst.nif}</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 text-xs text-slate-500 pt-1 border-t border-slate-50">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{inst.morada}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}