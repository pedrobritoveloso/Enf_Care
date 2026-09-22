"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    password: "",
    confirmPassword: "",
  });

  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: "As palavras-passes não coincidem.",
      }));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        } else {
          setGeneralError(data.error || "Erro ao criar conta.");
        }
        return;
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setGeneralError("Não foi possível ligar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md border border-slate-100">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Criar Perfil de Enfermeiro
        </h2>
        <p className="text-sm text-slate-500 text-center mb-6">
          Preencha os seus dados para efetuar o registo na plataforma.
        </p>

        {generalError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none ${
                fieldErrors.nome
                  ? "border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:ring-blue-500"
              }`}
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            {fieldErrors.nome && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none ${
                fieldErrors.email
                  ? "border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:ring-blue-500"
              }`}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Número de Telemóvel
            </label>
            <input
              type="tel"
              required
              placeholder="912345678"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none ${
                fieldErrors.telefone
                  ? "border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:ring-blue-500"
              }`}
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            />
            {fieldErrors.telefone && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.telefone}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Palavra-passe
            </label>
            <input
              type="password"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none ${
                fieldErrors.password
                  ? "border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:ring-blue-500"
              }`}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            {fieldErrors.password ? (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                Mínimo 8 carateres (com maiúscula, minúscula, número e símbolo).
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar Palavra-passe
            </label>
            <input
              type="password"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none ${
                fieldErrors.confirmPassword
                  ? "border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:ring-blue-500"
              }`}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "A criar conta..." : "Registar"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Iniciar Sessão
          </Link>
        </div>
      </div>
    </div>
  );
}