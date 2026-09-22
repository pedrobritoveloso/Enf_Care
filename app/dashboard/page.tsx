"use client";

import { useState, useEffect } from "react";
import DashboardAdmin from "@/components/DashBoardAdmin";
import DashboardEnfermeiro from "@/components/DashBoardEnfermeiro";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) throw new Error("Falha ao obter dados da sessão.");
        
        const data = await res.json();
        // Converte para maiúsculas para evitar bugs de case sensitivity
        setRole(data?.role ? String(data.role).toUpperCase() : null);
      } catch (err: any) {
        console.error(err);
        setError("Não foi possível carregar a dashboard.");
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, []);

  const dataAtual = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">A carregar dashboard...</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-rose-500 text-sm">{error}</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-xs text-slate-400 capitalize mt-0.5">{dataAtual}</p>
      </div>

      {role === "ADMIN" && <DashboardAdmin />}
      {(role === "ENFERMEIRO" || role === "NURSE") && <DashboardEnfermeiro />}

      {/* Fallback caso o role retornado não corresponda a nenhum conhecido */}
      {role && !["ADMIN", "ENFERMEIRO", "NURSE"].includes(role) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-4 rounded-2xl">
          Perfil detetado (<strong>{role}</strong>) sem painel configurado.
        </div>
      )}
    </div>
  );
}