"use client";

import { useState } from "react";

interface ProfileSettingsProps {
  initialTelefone?: string;
}

export default function ProfileSettings({ initialTelefone = "" }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    telefone: initialTelefone,
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        } else {
          setMessage({ type: "error", text: data.error || "Erro ao atualizar dados." });
        }
        return;
      }

      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao ligar ao servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-lg">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Definições de Perfil
      </h3>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Número de Telemóvel
          </label>
          <input
            type="tel"
            required
            className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${
              fieldErrors.telefone
                ? "border-red-500 focus:ring-red-200"
                : "border-slate-300 focus:ring-blue-500"
            }`}
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
          />
          {fieldErrors.telefone && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.telefone}</p>
          )}
        </div>

        <hr className="my-4 border-slate-100" />

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Alterar Palavra-passe (Opcional)
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Palavra-passe Atual
          </label>
          <input
            type="password"
            className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${
              fieldErrors.currentPassword
                ? "border-red-500 focus:ring-red-200"
                : "border-slate-300 focus:ring-blue-500"
            }`}
            value={formData.currentPassword}
            onChange={(e) =>
              setFormData({ ...formData, currentPassword: e.target.value })
            }
          />
          {fieldErrors.currentPassword && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.currentPassword}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nova Palavra-passe
          </label>
          <input
            type="password"
            className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${
              fieldErrors.newPassword
                ? "border-red-500 focus:ring-red-200"
                : "border-slate-300 focus:ring-blue-500"
            }`}
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          />
          {fieldErrors.newPassword && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.newPassword}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Confirmar Nova Palavra-passe
          </label>
          <input
            type="password"
            className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ${
              fieldErrors.confirmNewPassword
                ? "border-red-500 focus:ring-red-200"
                : "border-slate-300 focus:ring-blue-500"
            }`}
            value={formData.confirmNewPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmNewPassword: e.target.value })
            }
          />
          {fieldErrors.confirmNewPassword && (
            <p className="text-xs text-red-600 mt-1">
              {fieldErrors.confirmNewPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "A guardar..." : "Guardar Alterações"}
        </button>
      </form>
    </div>
  );
}