"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Calendar, 
  HeartHandshake, 
  Users, 
  Building2, 
  TrendingUp, 
  LogOut,
  ChevronRight,
  User
} from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (
    status !== "authenticated" || 
    pathname === "/login" || 
    pathname === "/register"
  ) {
    return null;
  }

  const userRole = (session?.user as any)?.tipo || session?.user?.role;
  const isAdmin = userRole === "ADMIN";

  const perfilHref = isAdmin ? "/admin" : "/perfil";

  // Arrays de navegação sem o item "Perfil"
  const adminNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Escala", href: "/admin/turnos", icon: Calendar },
    { label: "Disponabilidades", href: "/admin/disponibilidades", icon: HeartHandshake },
    { label: "Enfermeiros", href: "/admin/enfermeiros", icon: Users },
    { label: "Instituições", href: "/admin/instituicoes", icon: Building2 },
    { label: "Receita", href: "/admin/receita", icon: TrendingUp },
  ];

  const enfermeiroNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Turnos Disponíveis", href: "/turnos", icon: Calendar },
    { label: "Minha Disponibilidade", href: "/disponibilidade", icon: HeartHandshake },
    { label: "Instituições", href: "/instituicoes", icon: Building2 },
  ];

  const navItems = isAdmin ? adminNavItems : enfermeiroNavItems;

  return (
    <>
      {/* Top Bar Fixa */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
            💚
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">
            MyEnfCare
          </span>
        </Link>

        {/* Único acesso ao Perfil (Canto Superior Direito) */}
        <Link
          href={perfilHref}
          className={`p-2 rounded-xl transition-all ${
            pathname === perfilHref
              ? "bg-brand-800 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
          title="O Meu Perfil"
        >
          <User className="w-5 h-5" />
        </Link>
      </header>

      {/* Overlay Escuro */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sliding Mobile Menu Drawer */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] bg-white z-50 p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-800 rounded-xl flex items-center justify-center text-white text-lg">
                💚
              </div>
              <div>
                <h2 className="font-bold text-slate-900 leading-tight">MyEnfCare</h2>
                <p className="text-[10px] tracking-wider text-gray-400 font-medium uppercase">
                  {isAdmin ? "Gestão de Escalas" : "Área do Enfermeiro"}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl font-medium text-sm transition-all ${
                    isActive
                      ? "bg-brand-800 text-white shadow-md shadow-brand-800/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-2xl font-medium text-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
}