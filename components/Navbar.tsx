"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  FileText, 
  LogOut,
  ChevronRight,
  User,
  Bell
} from "lucide-react";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const fetchNotificacoes = useCallback(async () => {
    try {
      const res = await fetch("/api/notificacoes");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotificacoes(data);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotificacoes();
      const interval = setInterval(fetchNotificacoes, 15000);
      return () => clearInterval(interval);
    }
  }, [status, fetchNotificacoes]);

  // Fechar o dropdown automaticamente ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const marcarComoLidas = async () => {
    try {
      await fetch("/api/notificacoes", { method: "PATCH" });
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      console.error("Erro ao marcar notificações como lidas:", err);
    }
  };

  const handleNotificacaoClick = (notificacao: Notificacao) => {
    setShowNotifDropdown(false);

    const userRole = (session?.user as any)?.tipo || session?.user?.role;
    const isAdmin = userRole === "ADMIN";

    // Direcionar com base no tipo de utilizador e contexto da notificação
    if (isAdmin) {
      // Se for admin e envolver candidaturas ou turnos, vai para a escala/turnos
      router.push("/admin/turnos");
    } else {
      // Se for enfermeiro, vai para o seu horário / turnos disponíveis
      if (notificacao.titulo.toLowerCase().includes("aprovada") || notificacao.titulo.toLowerCase().includes("horário")) {
        router.push("/enfermeiro/horario");
      } else {
        router.push("/turnos");
      }
    }
  };

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

  const adminNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Escala", href: "/admin/turnos", icon: Calendar },
    { label: "Disponibilidades", href: "/admin/disponibilidades", icon: HeartHandshake },
    { label: "Enfermeiros", href: "/admin/enfermeiros", icon: Users },
    { label: "Instituições", href: "/admin/instituicoes", icon: Building2 },
    { label: "Receita", href: "/admin/receita", icon: TrendingUp },
    { label: "Relatórios", href: "/admin/relatorios", icon: FileText },
  ];

  const enfermeiroNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Turnos Disponíveis", href: "/turnos", icon: Calendar },
    { label: "Meu Horário", href: "/enfermeiro/horario", icon: HeartHandshake },
    { label: "Instituições", href: "/instituicoes", icon: Building2 },
    { label: "Histórico", href: "/enfermeiro/historico", icon: FileText },
  ];

  const navItems = isAdmin ? adminNavItems : enfermeiroNavItems;
  const naoLidasCount = notificacoes.filter((n) => !n.lida).length;

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

        {/* Zona de Ações Superiores: Sino e Perfil */}
        <div className="relative flex items-center gap-1" ref={dropdownRef}>
          {/* Botão do Sino */}
          <button
            onClick={() => {
              const novoEstado = !showNotifDropdown;
              setShowNotifDropdown(novoEstado);
              if (novoEstado && naoLidasCount > 0) {
                marcarComoLidas();
              }
            }}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 relative transition-all cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {naoLidasCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Dropdown de Notificações */}
          {showNotifDropdown && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Notificações
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">
                  {notificacoes.length} total
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {notificacoes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 italic">
                    Sem notificações.
                  </p>
                ) : (
                  notificacoes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificacaoClick(n)}
                      className={`p-3 rounded-xl border text-xs space-y-1 transition-all cursor-pointer hover:shadow-sm ${
                        n.lida
                          ? "bg-slate-50 border-slate-100 hover:bg-slate-100/80"
                          : "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/60"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <p className="font-bold text-slate-900 leading-snug">{n.titulo}</p>
                        {!n.lida && <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{n.mensagem}</p>
                      <span className="text-[9px] text-slate-400 block pt-1 font-medium">
                        {new Date(n.criadoEm).toLocaleString("pt-PT")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Acesso ao Perfil */}
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
        </div>
      </header>

      {/* Overlay Escuro para o Drawer Mobile */}
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