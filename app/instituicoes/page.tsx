"use client";

import { useSession } from "next-auth/react";
import InstituicaoList from "@/components/InstituiçaoList";
import EnfermeiroInstituicoesList from "@/components/EnfermeirosInstituiçaoList";

export default function InstituicoesPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        A carregar instituições...
      </div>
    );
  }

  // Identifica o tipo/role do utilizador
  const userRole = (session?.user as any)?.tipo || session?.user?.role;

  return (
    <div className="p-4 max-w-lg mx-auto">
      {userRole === "ADMIN" ? (
        <InstituicaoList />
      ) : (
        <EnfermeiroInstituicoesList />
      )}
    </div>
  );
}