"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  FileText,
  ArrowLeft,
  QrCode,
  Edit3,
  RefreshCw,
  Phone,
  Mail,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Instituicao {
  id: string;
  nome: string;
  nif: string;
  morada: string;
  telefone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  qrCode?: string | null;
  ativo?: boolean;
}

export default function InstituicaoList() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "form">("list");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Estado do formulário com Email e Telefone
  const [formData, setFormData] = useState({
    nome: "",
    nif: "",
    morada: "",
    telefone: "",
    email: "",
    latitude: "",
    longitude: "",
  });
  const [submitting, setSubmitting] = useState(false);

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

  const abrirCriacao = () => {
    setEditandoId(null);
    setFormData({
      nome: "",
      nif: "",
      morada: "",
      telefone: "",
      email: "",
      latitude: "",
      longitude: "",
    });
    setView("form");
  };

  const abrirEdicao = (inst: Instituicao) => {
    setEditandoId(inst.id);
    setFormData({
      nome: inst.nome || "",
      nif: inst.nif || "",
      morada: inst.morada || "",
      telefone: inst.telefone || "",
      email: inst.email || "",
      latitude: inst.latitude?.toString() || "",
      longitude: inst.longitude?.toString() || "",
    });
    setView("form");
  };

  const handleGerarQrCode = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/instituicoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gerarQrCode: true }),
      });

      if (res.ok) {
        fetchInstituicoes();
      } else {
        alert("Erro ao gerar QR Code.");
      }
    } catch (err) {
      console.error("Erro ao gerar QR Code:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editandoId
        ? `/api/admin/instituicoes/${editandoId}`
        : "/api/admin/instituicoes";
      const method = editandoId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          nif: formData.nif,
          morada: formData.morada,
          telefone: formData.telefone,
          email: formData.email,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setFormData({
          nome: "",
          nif: "",
          morada: "",
          telefone: "",
          email: "",
          latitude: "",
          longitude: "",
        });
        setEditandoId(null);
        setView("list");
        fetchInstituicoes();
      } else {
        alert(data.error || "Erro ao guardar instituição");
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

  // VISTA: FORMULÁRIO (CRIAR OU EDITAR)
  if (view === "form") {
    return (
      <div className="max-w-md mx-auto py-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {editandoId ? "Editar Instituição" : "Nova Instituição / Hospital"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {editandoId
                  ? "Atualize os dados da entidade selecionada"
                  : "Adicione uma nova entidade e gere o respetivo QR Code de assiduidade"}
              </p>
            </div>
            <button
              onClick={() => setView("list")}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          </div>

          <hr className="border-slate-100" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nome da Instituição *</label>
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
              <label className="text-xs font-semibold text-slate-700">NIF *</label>
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
              <label className="text-xs font-semibold text-slate-700">Morada Completa *</label>
              <input
                type="text"
                required
                placeholder="Rua Central, Porto"
                value={formData.morada}
                onChange={(e) => setFormData({ ...formData, morada: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Novos inputs de Telefone e Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Telefone</label>
                <input
                  type="text"
                  placeholder="220000000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  placeholder="contacto@hospital.pt"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
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
                className="py-2.5 px-5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "A guardar..." : editandoId ? "Salvar Alterações" : "Guardar Instituição"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // VISTA 1: LISTAGEM DE INSTITUIÇÕES COM DETALHES DE CONTACTO
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Instituições & QR Codes</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{instituicoes.length} entidades registadas</p>
      </div>

      <button
        onClick={abrirCriacao}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-2xl w-full flex items-center justify-center gap-2 shadow-md transition-all text-sm cursor-pointer"
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
            <div key={inst.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between">
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
                  
                  {/* Apresentação de Telefone e Email caso existam */}
                  {(inst.telefone || inst.email) && (
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1">
                      {inst.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {inst.telefone}
                        </span>
                      )}
                      {inst.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {inst.email}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => abrirEdicao(inst)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  title="Editar Instituição"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Bloco do QR Code */}
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-full justify-between">
                {inst.qrCode ? (
                  <>
                    <div className="bg-white p-1.5 rounded-xl border shadow-2xs">
                      <QRCodeSVG value={inst.qrCode} size={56} level="M" />
                    </div>
                    <div className="space-y-1 text-right flex-1">
                      <span className="text-[10px] font-mono bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded inline-block">
                        {inst.qrCode}
                      </span>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleGerarQrCode(inst.id)}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                          title="Alterar/Regerar QR Code"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Alterar QR</span>
                        </button>
                        <span className="text-slate-300">|</span>
                        <a
                          href={`/admin/instituicoes/${inst.id}/qrcode`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Imprimir Cartaz</span>
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between py-1">
                    <span className="text-xs text-amber-600 font-medium italic">
                      ⚠️ Esta instituição ainda não tem QR Code gerado.
                    </span>
                    <button
                      onClick={() => handleGerarQrCode(inst.id)}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Gerar QR Code</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}