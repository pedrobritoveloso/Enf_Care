"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("E-mail ou palavra-passe incorretos.");
      setLoading(false);
    } else {
      // Obter a sessão atualizada para verificar o perfil
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;

      if (res?.error) {
      setError("E-mail ou palavra-passe incorretos.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-blue-900 mb-2">
          MyEnfCare
        </h1>
        <p className="text-sm text-center text-gray-600 mb-6">
          Gestão de Enfermagem e Assiduidade
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: admin@myenfcare.pt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Palavra-passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>
          <div className="mt-4 text-center text-sm text-slate-600">
            Ainda não tem conta?{" "}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Criar novo perfil de Enfermeiro
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}