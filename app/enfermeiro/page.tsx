"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, Stethoscope, Euro, CheckCircle2 } from "lucide-react";

export default function NurseProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados dos dados do perfil
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cedula, setCedula] = useState("");
  const [precoHora, setPrecoHora] = useState<number | null>(null);

  // Estados para alteração de palavra-passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data) {
          setNome(data.nome || "");
          setEmail(data.email || "");
          setTelefone(data.telefone || "");
          if (data.enfermeiro) {
            setCedula(data.enfermeiro.cedulaProfissional || "");
            setPrecoHora(data.enfermeiro.precoHora ?? null);
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar perfil:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          confirmNewPassword: confirmPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar perfil.");
      }

      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao guardar alterações." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm font-medium">
        A carregar dados do perfil...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          O Seu Perfil
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Consulte e gira os seus dados pessoais e de acesso à plataforma.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-red-50 text-red-600 border border-red-100"
          }`}
        >
          {message.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Cartão de Resumo do Enfermeiro (Topo) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-700 font-extrabold text-xl shrink-0 shadow-inner">
          {nome ? nome.substring(0, 2).toUpperCase() : "EN"}
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="font-bold text-slate-900 text-lg leading-snug">{nome || "Enfermeiro(a)"}</h2>
            <span className="w-fit mx-auto sm:mx-0 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md uppercase tracking-wider flex items-center gap-1">
              <Stethoscope className="w-3 h-3" />
              ENFERMEIRO
            </span>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{telefone || "Sem telemóvel"}</span>
            </div>
          </div>

          {(cedula || precoHora !== null) && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 pt-1 text-[11px] font-semibold text-slate-600 border-t border-slate-100 mt-2">
              {cedula && (
                <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                  Cédula: {cedula}
                </span>
              )}
              {precoHora !== null && (
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                  <Euro className="w-3 h-3" /> {precoHora.toFixed(2)}/h
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Formulário de Edição (Baixo) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Informações Pessoais</h3>
            <p className="text-xs text-slate-400 mt-0.5">Atualize os seus dados de identificação e contacto.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Nome Completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Ana Maria"
                className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="enfermeiro@exemplo.pt"
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Número de Telemóvel
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Ex: 910000000"
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                Alterar Palavra-passe
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Deixe em branco se não pretender alterar a sua palavra-passe atual.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Palavra-passe Atual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nova Palavra-passe</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Confirmar Nova Palavra-passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
            >
              {saving ? "A guardar..." : "Guardar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}