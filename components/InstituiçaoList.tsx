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
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Instituicao {
  id: string;
  nome: string;
  nif: string;
  morada: string;
  latitude?: number | null;
  longitude?: number | null;
  qrCode?: string | null;
}

export default function InstituicaoList() {
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

  // Carregar instituições da API
  const fetchInstituicoes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/instituicoes");
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
      alert("Erro de comunicação com o servidor.");
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

  // VISTA 2: FORMULÁRIO DE CRIAÇÃO
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
                Adicione uma nova entidade e gere o respetivo QR Code de assiduidade
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nome da Instituição</label>
              <input
                type="text"
                required
                placeholder="Ex: Hospital X"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">NIF</label>
              <input
                type="text"
                required
                placeholder="500123456"
                value={formData.nif}
                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Morada Completa</label>
              <input
                type="text"
                required
                placeholder="Rua Central, Porto"
                value={formData.morada}
                onChange={(e) => setFormData({ ...formData, morada: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Latitude (Opcional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="41.1579"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Longitude (Opcional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="-8.6291"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

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
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? "A guardar..." : "Guardar Instituição"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // VISTA 1: LISTAGEM DE INSTITUIÇÕES COM QR CODE
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Instituições & QR Codes</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{instituicoes.length} entidades registadas</p>
      </div>

      <button
        onClick={() => setView("create")}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-2xl w-full flex items-center justify-center gap-2 shadow-md transition-all text-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Nova Instituição</span>
      </button>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar instituição ou NIF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-400 text-sm">A carregar instituições...</div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-medium text-slate-600">Nenhuma instituição encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((inst) => (
            <div key={inst.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">{inst.nome}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <FileText className="w-3.5 h-3.5" />
                  <span>NIF: {inst.nif}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{inst.morada}</span>
                </div>
              </div>

              {/* Bloco do QR Code e Impressão */}
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full sm:w-auto justify-between sm:justify-start">
                {inst.qrCode && (
                  <div className="bg-white p-1.5 rounded-xl border shadow-2xs">
                    <QRCodeSVG value={inst.qrCode} size={64} level="M" />
                  </div>
                )}
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-mono bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded block">
                    {inst.qrCode || "Sem QR"}
                  </span>
                  <a
                    href={`/admin/instituicoes/${inst.id}/qrcode`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold pt-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Imprimir Cartaz</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}